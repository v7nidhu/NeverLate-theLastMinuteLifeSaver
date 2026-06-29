// File: src/components/AnalyticsDashboard.tsx

import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, AreaChart, Area, Cell, PieChart, Pie } from 'recharts';
import { Award, Zap, AlertTriangle, Sparkles, TrendingUp, RefreshCw, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function AnalyticsDashboard() {
  const { theme, tasks, reports, generateWeeklyReport, isLoading, focusSession, currentUser } = useAppStore();
  const [reportSuccess, setReportSuccess] = useState(false);

  const themeDark = theme === 'dark';

  const isDataFed = currentUser !== null && (tasks.length > 0 || focusSession.totalFocusHours > 0);

  // Calculations
  const totalTasks = currentUser ? tasks.length : 0;
  const completedTasks = currentUser ? tasks.filter(t => t.completed).length : 0;
  const pendingTasks = currentUser ? tasks.filter(t => !t.completed).length : 0;

  const now = new Date();
  const overdueTasks = currentUser ? tasks.filter(t => {
    if (t.completed) return false;
    const deadlineDate = new Date(t.deadline);
    // Set to end of day or compare exactly
    return deadlineDate < now;
  }).length : 0;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const overdueRate = totalTasks > 0 ? Math.round((overdueTasks / totalTasks) * 100) : 0;

  // Chart 1: Tasks status distribution
  const statusData = [
    { name: 'Completed', value: completedTasks, color: '#a855f7' },
    { name: 'Overdue', value: overdueTasks, color: '#ef4444' },
    { name: 'In Progress', value: Math.max(0, pendingTasks - overdueTasks), color: '#3b82f6' }
  ];

  // Chart 2: Focus Workload Over Time (mock weekly log)
  const focusData = [
    { day: 'Mon', hours: 1.2 },
    { day: 'Tue', hours: 2.0 },
    { day: 'Wed', hours: 1.5 },
    { day: 'Thu', hours: focusSession.totalFocusHours > 2.5 ? focusSession.totalFocusHours - 1.0 : 1.0 },
    { day: 'Fri', hours: focusSession.totalFocusHours },
  ];

  const handleGenerateReport = async () => {
    await generateWeeklyReport();
    setReportSuccess(true);
    setTimeout(() => setReportSuccess(false), 4000);
  };

  const currentReport = reports[0];

  return (
    <div id="analytics-dashboard" className="space-y-6">
      
      {/* Dynamic Stat Badges */}
      <div className={`grid grid-cols-2 ${isDataFed ? 'lg:grid-cols-4' : ''} gap-4`}>
        
        {/* Metric 1 */}
        <div className={`p-4 rounded-xl border flex items-center gap-3 transition-all duration-300 ${
          themeDark ? 'bg-[#151518] border-purple-950/40 text-gray-100' : 'bg-white border-purple-100 text-gray-800'
        }`}>
          <div className="p-2.5 bg-purple-600/10 text-purple-400 rounded-lg">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-[10px] font-mono uppercase tracking-wider ${themeDark ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontSize: '11px' }}>Completion</p>
            <h4 className="text-xl font-bold tracking-tight">{completionRate}%</h4>
            <p className="text-[10px] text-purple-500">{completedTasks} of {totalTasks} Completed</p>
          </div>
        </div>

        {/* Metric 2 */}
        <div className={`p-4 rounded-xl border flex items-center gap-3 transition-all duration-300 ${
          themeDark ? 'bg-[#151518] border-purple-950/40 text-gray-100' : 'bg-purple-50 border-purple-200 text-purple-950 shadow-sm'
        }`}>
          <div className="p-2.5 bg-red-600/10 text-red-400 rounded-lg">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <p className={`text-[10px] font-mono uppercase tracking-wider ${themeDark ? 'text-gray-500' : 'text-gray-400'}`} style={{ fontSize: '11px' }}>Overdue Rate</p>
            <h4 className="text-xl font-bold tracking-tight">{overdueRate}%</h4>
            <p className="text-[10px] text-red-500">{overdueTasks} Critical Backlogs</p>
          </div>
        </div>

        {isDataFed && (
          <>
            {/* Metric 3 */}
            <div className={`p-4 rounded-xl border flex items-center gap-3 transition-all duration-300 ${
              themeDark ? 'bg-[#151518] border-purple-950/40 text-gray-100' : 'bg-white border-purple-100 text-gray-800'
            }`}>
              <div className="p-2.5 bg-blue-600/10 text-blue-400 rounded-lg">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <p className={`text-[10px] font-mono uppercase tracking-wider ${themeDark ? 'text-gray-500' : 'text-gray-400'}`}>Focus Hours</p>
                <h4 className="text-xl font-bold tracking-tight">{focusSession.totalFocusHours}h</h4>
                <p className="text-[10px] text-blue-500">{focusSession.completedSessions} Sprints Completed</p>
              </div>
            </div>

            {/* Metric 4 */}
            <div className={`p-4 rounded-xl border flex items-center gap-3 transition-all duration-300 ${
              themeDark ? 'bg-[#151518] border-purple-950/40 text-gray-100' : 'bg-white border-purple-100 text-gray-800'
            }`}>
              <div className="p-2.5 bg-amber-600/10 text-amber-500 rounded-lg">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <p className={`text-[10px] font-mono uppercase tracking-wider ${themeDark ? 'text-gray-500' : 'text-gray-400'}`}>Weekly Score</p>
                <h4 className="text-xl font-bold tracking-tight">
                  {currentReport ? currentReport.productivityScore : Math.max(20, Math.round(completionRate + focusSession.totalFocusHours * 2.5))}
                </h4>
                <p className="text-[10px] text-amber-500">Based on task velocity</p>
              </div>
            </div>
          </>
        )}

      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Task completion distribution chart */}
        <div className={`p-5 rounded-2xl border transition-all duration-300 ${isDataFed ? '' : 'lg:col-span-2'} ${
          themeDark ? 'bg-[#121214] border-purple-950/40 text-gray-100 shadow-md' : 'bg-white border-purple-100 text-gray-800'
        }`}>
          <div className="mb-4">
            <h3 className="text-sm font-bold tracking-tight">How My Tasks Look</h3>
            <p className={`text-[10px] ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>A simple, friendly overview of your completed, active, and overdue tasks.</p>
          </div>
          <div className="h-56">
            {totalTasks === 0 ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-xs text-gray-500">
                No active tasks to visualize. Create tasks above.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData} barSize={45}>
                  <XAxis dataKey="name" stroke={themeDark ? "#4b5563" : "#9ca3af"} fontSize={10} tickLine={false} />
                  <YAxis stroke={themeDark ? "#4b5563" : "#9ca3af"} fontSize={10} tickLine={false} />
                  <Tooltip 
                    cursor={{ fill: 'rgba(168, 85, 247, 0.05)' }}
                    contentStyle={{ 
                      backgroundColor: themeDark ? '#18181b' : '#ffffff', 
                      borderColor: '#a855f7',
                      color: themeDark ? '#f4f4f5' : '#18181b',
                      fontSize: 11,
                      borderRadius: 8,
                      borderWidth: 1,
                      boxShadow: '0 4px 12px rgba(168, 85, 247, 0.1)'
                    }} 
                  />
                  <Bar dataKey="value" isAnimationActive={true} animationDuration={1200} animationEasing="ease-out">
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} radius={[6, 6, 0, 0]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {isDataFed && (
          /* Focus Hours Daily Log */
          <div className={`p-5 rounded-2xl border transition-all duration-300 ${
            themeDark ? 'bg-[#121214] border-purple-950/40 text-gray-100 shadow-md' : 'bg-white border-purple-100 text-gray-800'
          }`}>
            <div className="mb-4">
              <h3 className="text-sm font-bold tracking-tight">My Daily Focus Flow</h3>
              <p className={`text-[10px] ${themeDark ? 'text-gray-400' : 'text-gray-500'}`}>Your total focus time tracked day by day.</p>
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={focusData}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" stroke={themeDark ? "#4b5563" : "#9ca3af"} fontSize={10} tickLine={false} />
                  <YAxis stroke={themeDark ? "#4b5563" : "#9ca3af"} fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: themeDark ? '#18181b' : '#ffffff', 
                      borderColor: '#a855f7',
                      color: themeDark ? '#f4f4f5' : '#18181b',
                      fontSize: 11,
                      borderRadius: 8,
                      borderWidth: 1,
                      boxShadow: '0 4px 12px rgba(168, 85, 247, 0.1)'
                    }} 
                  />
                  <Area type="monotone" dataKey="hours" stroke="#a855f7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorHours)" isAnimationActive={true} animationDuration={1200} animationEasing="ease-out" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

      </div>

      {/* AI Performance Diagnosis & Recovery Plan Panel */}
      <div className={`p-5 rounded-2xl border transition-all duration-300 ${
        themeDark ? 'bg-[#121214] border-purple-950/40 text-gray-100' : 'bg-white border-purple-100 text-gray-800'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-purple-900/10 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-600/15 text-amber-500 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">Your Friendly AI Success Guide</h3>
              <p className={`text-[10px] ${themeDark ? 'text-gray-400' : 'text-gray-500'}`} style={{ fontSize: '11px' }}>Personalized AI assistance with deadlines, workload diagnoses, and recovery plans.</p>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGenerateReport}
            disabled={isLoading || totalTasks === 0}
            id="generate-report-btn"
            className={`py-2 px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isLoading || totalTasks === 0
                ? 'bg-purple-800/10 text-purple-400/40 border border-purple-900/10'
                : 'bg-[#c27aff] hover:bg-[#b05cff] text-white shadow-md'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="text-white" style={{ color: '#ffffff' }}>{isLoading ? 'Talking to AI Coach...' : 'Get AI Success Advice'}</span>
          </motion.button>
        </div>

        {/* Report Content Body */}
        {currentReport ? (
          <div className="space-y-4">
            
            {/* Summary Block */}
            <div className={`p-4 rounded-xl ${themeDark ? 'bg-[#18181b]/50' : 'bg-purple-50/40 border border-purple-100'}`}>
              <h4 className="text-xs font-bold text-purple-400 mb-1 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Your Progress Wave
              </h4>
              <p className="text-xs leading-relaxed">{currentReport.summary}</p>
            </div>

            {/* Recovery Road Block */}
            <div>
              <h4 className="text-xs font-bold text-red-400 mb-2.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Easy Steps to Win Back Your Time
              </h4>
              <ul className="space-y-2.5">
                {currentReport.recoveryPlan.split('\n').filter(Boolean).map((step, index) => (
                  <motion.li
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-2 text-xs"
                  >
                    <span className="w-5 h-5 flex items-center justify-center bg-purple-600/20 text-purple-400 rounded-full font-mono text-[10px] shrink-0 font-bold mt-0.5">
                      {index + 1}
                    </span>
                    <span className={`${themeDark ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                      {step.replace(/^\d+[\.\s\-]+/, '')}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="w-8 h-8 text-purple-500/40 mb-2 animate-bounce" />
            <p className="text-xs font-medium">No advice created yet.</p>
            <p className={`text-[10px] max-w-sm mt-1 ${themeDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Let's ask our friendly AI Coach to look over your deadlines and give you easy, stress-free steps to succeed!
            </p>
          </div>
        )}
      </div>

    </div>
  );
}
