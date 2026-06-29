// File: src/components/CalendarView.tsx

import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import { Calendar, Plus } from 'lucide-react';
import TaskForm from './TaskForm';

export default function CalendarView() {
  const { theme, tasks } = useAppStore();
  const themeDark = theme === 'dark';
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Map tasks to FullCalendar event format
  const events = tasks.map((task) => {
    let color = '#a855f7'; // purple default
    if (task.completed) {
      color = '#10b981'; // green for completed
    } else {
      switch (task.riskLevel) {
        case 'Critical':
          color = '#ef4444'; // red
          break;
        case 'High':
          color = '#f97316'; // orange
          break;
        case 'Medium':
          color = '#eab308'; // yellow
          break;
        case 'Low':
          color = '#3b82f6'; // blue
          break;
      }
    }

    return {
      id: task.id,
      title: `${task.completed ? '✓ ' : ''}${task.title}`,
      start: task.deadline,
      allDay: true,
      backgroundColor: color,
      borderColor: color,
      textColor: '#ffffff',
    };
  });

  const CalendarComponent = FullCalendar as any;

  const handleDateClick = (info: any) => {
    setSelectedDate(info.dateStr);
    setShowTaskForm(true);
  };

  return (
    <div
      id="calendar-view-container"
      className={`p-5 rounded-2xl border transition-all duration-300 ${
        themeDark
          ? 'bg-[#121214] border-purple-950/40 text-gray-100 shadow-md'
          : 'bg-white border-purple-200 text-purple-950 shadow-[0_8px_30px_rgba(122,87,248,0.04)]'
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="p-1.5 bg-purple-600/10 text-purple-400 rounded-lg">
          <Calendar className="w-5 h-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold tracking-tight">Workload Deadline Calendar</h3>
          <p className={`text-[10px] ${themeDark ? 'text-gray-400' : 'text-gray-500'}`} style={{ fontSize: '11px' }}>
            Deadline visualizer color-coded by workload urgency risk level
          </p>
        </div>
      </div>

      <div className={`fc-custom-theme text-xs rounded-xl overflow-hidden p-2 ${
        themeDark ? 'bg-[#18181b]/40 text-gray-200' : 'bg-gray-50 text-gray-800'
      }`}>
        <CalendarComponent
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          events={events}
          height={380}
          headerToolbar={{
            left: 'prev,next',
            center: 'title',
            right: 'today'
          }}
          editable={false}
          selectable={true}
          dateClick={handleDateClick}
          dayCellClassNames={(arg: any) => {
            if (arg.dateStr === selectedDate) {
              return 'bg-purple-600/30';
            }
            return '';
          }}
        />
      </div>

      {/* Legend */}
      <div 
        className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-purple-900/10 text-[10px] font-mono justify-center"
        style={{ fontSize: '14px' }}
      >
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
          <span>Completed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" />
          <span>Critical Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
          <span>High Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
          <span>Medium Risk</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]" />
          <span>Low Risk</span>
        </div>
      </div>

      {/* Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className={`w-full max-w-md p-6 rounded-2xl shadow-xl ${themeDark ? 'bg-[#18181b]' : 'bg-white'}`}>
              <TaskForm onClose={() => setShowTaskForm(false)} initialDeadline={selectedDate || undefined} />
            </div>
        </div>
      )}
    </div>
  );
}
