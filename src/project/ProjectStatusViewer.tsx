import React, { useState, useEffect } from 'react';
import projectData from './project.json';
import './ProjectStatusViewer.css';
import { SearchInput } from '../components/ui/search-input';

const ProjectStatusViewer: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [statusType, setStatusType] = useState('overall');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  // Calculate status for tasks, subtasks, etc.
  const calculateStatus = (items: any[]): string => {
    if (!items || items.length === 0) return 'not started';

    const statuses = items.map(item => {
      if (item.status) return item.status;
      if (item.subtasks && item.subtasks.length > 0) return calculateStatus(item.subtasks);
      if (item.tasks && item.tasks.length > 0) return calculateStatus(item.tasks);
      return 'not started';
    });

    if (statuses.every(status => status === 'completed')) return 'completed';
    if (statuses.some(status => status === 'in progress')) return 'in progress';
    return 'not started';
  };

  // Calculate status for a phase with iterations
  const calculatePhaseStatus = (phase: any): string => {
    if (phase.iterations && phase.iterations.length > 0) {
      const statuses = phase.iterations.map((iteration: any) =>
        calculateStatus(iteration.tasks || []));
      if (statuses.every(status => status === 'completed')) return 'completed';
      if (statuses.some(status => status === 'in progress')) return 'in progress';
      return 'not started';
    } else if (phase.tasks && phase.tasks.length > 0) {
      return calculateStatus(phase.tasks);
    }
    return 'not started';
  };

  // Sort items helper
  const sortItems = (items: any[], sortMethod: string) => {
    if (sortMethod === 'name') {
      return [...items].sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortMethod === 'status') {
      return [...items].sort((a, b) => {
        const statusA = a.status || calculateStatus(a.subtasks || (a.tasks ? a.tasks : []));
        const statusB = b.status || calculateStatus(b.subtasks || (b.tasks ? b.tasks : []));
        return statusA.localeCompare(statusB);
      });
    }
    return items;
  };

  // Check if all attributes are completed
  const areAllAttributesCompleted = (subtask: any): boolean => {
    const testStatus = subtask.testAutomation || 'N/A';
    const devStatus = subtask.devStatus || 'Pending';
    const manualStatus = subtask.manualTestingSignOff || 'Pending';

    return (testStatus === 'Completed' || testStatus === 'N/A') &&
           (devStatus === 'Completed' || devStatus === 'N/A') &&
           (manualStatus === 'Completed' || manualStatus === 'N/A');
  };

  // Initialize the expandedSections state based on completion status
  useEffect(() => {
    const initialExpandState: Record<string, boolean> = {};

    // Process phases
    projectData.project.phases.forEach(phase => {
      const phaseStatus = calculatePhaseStatus(phase);
      initialExpandState[phase.id] = phaseStatus !== 'completed';

      // Process iterations
      if (phase.iterations) {
        phase.iterations.forEach(iteration => {
          const iterationStatus = calculateStatus(iteration.tasks || []);
          const iterationId = `${phase.id}-${iteration.id}`;
          initialExpandState[iterationId] = iterationStatus !== 'completed';

          // Process tasks
          if (iteration.tasks) {
            iteration.tasks.forEach(task => {
              const taskStatus = calculateStatus(task.subtasks || []);
              const taskId = `${iterationId}-${task.id}`;
              initialExpandState[taskId] = taskStatus !== 'completed';
            });
          }
        });
      }
    });

    setExpandedSections(initialExpandState);
  }, []);

  // Toggle expanded/collapsed state
  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  // Render a subtask
  const renderSubtask = (subtask: any) => {
    if (!subtask.name.toLowerCase().includes(searchTerm.toLowerCase())) return null;

    if (filterStatus &&
       ((statusType === 'overall' && subtask.status !== filterStatus) ||
        (statusType === 'testAutomation' && (subtask.testAutomation || 'N/A') !== filterStatus) ||
        (statusType === 'devStatus' && (subtask.devStatus || 'Pending') !== filterStatus) ||
        (statusType === 'manualTestingSignOff' && (subtask.manualTestingSignOff || 'Pending') !== filterStatus))) {
      return null;
    }

    const statusClass = subtask.status.replace(' ', '-');
    const testAutomationClass = (subtask.testAutomation || 'N/A').replace('/', '-').replace(' ', '-');
    const devStatusClass = (subtask.devStatus || 'Pending').replace('/', '-').replace(' ', '-');
    const manualTestingClass = (subtask.manualTestingSignOff || 'Pending').replace('/', '-').replace(' ', '-');

    const allAttributesCompleted = areAllAttributesCompleted(subtask);
    const attributesClass = allAttributesCompleted ? 'status-details all-completed' : 'status-details';

    return (
      <div className="subtask" key={subtask.id} onClick={() => {
        // Toggle status details visibility on click
        const statusDetails = document.querySelector(`[data-subtask-id="${subtask.id}"] .status-details`);
        if (statusDetails) {
          statusDetails.classList.toggle('all-completed');
          statusDetails.classList.toggle('visible');
        }
      }} data-subtask-id={subtask.id}>
        <span className="task-id">{subtask.id}</span>{subtask.name}
        <span className={`status ${statusClass}`}>{subtask.status}</span>
        <div className={attributesClass}>
          <div className="status-item">
            <span className="status-label">Test:</span>
            <span className={`status ${testAutomationClass}`}>{subtask.testAutomation || 'N/A'}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Dev:</span>
            <span className={`status ${devStatusClass}`}>{subtask.devStatus || 'Pending'}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Manual:</span>
            <span className={`status ${manualTestingClass}`}>{subtask.manualTestingSignOff || 'Pending'}</span>
          </div>
        </div>
      </div>
    );
  };

  // Render a task
  const renderTask = (task: any, iterationId: string) => {
    const taskStatus = calculateStatus(task.subtasks || []);
    const taskId = `${iterationId}-${task.id}`;
    const isExpanded = expandedSections[taskId];

    return (
      <div className="task" key={task.id}>
        <strong onClick={() => toggleSection(taskId)}>
          <span className="task-id">{task.id}</span>{task.name}
          <span className={`status ${taskStatus.replace(' ', '-')}`}>{taskStatus}</span>
        </strong>
        <div className={`task-content ${isExpanded ? 'expanded' : 'hidden'}`}>
          {task.subtasks && sortItems(task.subtasks, sortBy).map(renderSubtask)}
        </div>
      </div>
    );
  };

  // Render an iteration
  const renderIteration = (iteration: any, phaseId: string) => {
    const iterationStatus = calculateStatus(iteration.tasks || []);
    const iterationId = `${phaseId}-${iteration.id}`;
    const isExpanded = expandedSections[iterationId];

    return (
      <div className="iteration" key={iteration.id}>
        <h3 onClick={() => toggleSection(iterationId)}>
          <span className="task-id">{iteration.id}</span>{iteration.name}
          <span className={`status ${iterationStatus.replace(' ', '-')}`}>{iterationStatus}</span>
        </h3>
        <div className={`iteration-content ${isExpanded ? 'expanded' : 'hidden'}`}>
          {iteration.tasks && sortItems(iteration.tasks, sortBy).map(task => renderTask(task, iterationId))}
        </div>
      </div>
    );
  };

  // Render a phase
  const renderPhase = (phase: any) => {
    const phaseStatus = calculatePhaseStatus(phase);
    const isExpanded = expandedSections[phase.id];

    return (
      <div className="phase" key={phase.id}>
        <h2 onClick={() => toggleSection(phase.id)}>
          <span className="task-id">{phase.id}</span>{phase.name}
          <span className={`status ${phaseStatus.replace(' ', '-')}`}>{phaseStatus}</span>
        </h2>
        <div className={`phase-content ${isExpanded ? 'expanded' : 'hidden'}`}>
          {phase.iterations && sortItems(phase.iterations, sortBy).map(iteration => renderIteration(iteration, phase.id))}
        </div>
      </div>
    );
  };

  return (
    <div className="container">
      <h1>Project Status</h1>

      <div className="controls">
        <div>
          <label htmlFor="search" className="block mb-1">Search Tasks</label>
          <SearchInput
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Enter task name..."
            wrapperClassName="w-full"
          />
        </div>
        <div>
          <label htmlFor="filter-status">Filter by status</label>
          <select
            id="filter-status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="not started">Not Started</option>
            <option value="in progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="Pending">Pending</option>
            <option value="Failed">Failed</option>
            <option value="N/A">N/A</option>
          </select>
        </div>
        <div>
          <label htmlFor="sort">Sort by</label>
          <select
            id="sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="name">Name</option>
            <option value="status">Status</option>
          </select>
        </div>
        <div>
          <label htmlFor="status-type">Status Type</label>
          <select
            id="status-type"
            value={statusType}
            onChange={(e) => setStatusType(e.target.value)}
          >
            <option value="overall">Overall Status</option>
            <option value="testAutomation">Test Automation</option>
            <option value="devStatus">Development</option>
            <option value="manualTestingSignOff">Manual Testing</option>
          </select>
        </div>
      </div>

      <div id="project-status">
        {projectData.project.phases && sortItems(projectData.project.phases, sortBy).map(renderPhase)}
      </div>
    </div>
  );
};

export default ProjectStatusViewer;
