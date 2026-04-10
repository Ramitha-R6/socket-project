import React, { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Activity, Zap, Clock, ShieldAlert, Monitor, ArrowDownToLine, RefreshCw, Settings, CheckCircle, Server, Download, XCircle, AlertTriangle } from 'lucide-react';

const App = () => {
  const [data, setData] = useState({ clients: [], analysis: {}, network: {} });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); 
  const [mode, setMode] = useState('LOCAL'); 
  const [serverIp, setServerIp] = useState('localhost:5001');
  const [inputIp, setInputIp] = useState('localhost:5001');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [alerts, setAlerts] = useState([]);
  
  // Track seen alerts so we don't spam
  const seenAlerts = useRef(new Set());

  const fetchData = async () => {
    try {
      const baseUrl = `http://${serverIp}`;
      const [clientsRes, analysisRes, networkRes] = await Promise.all([
        axios.get(`${baseUrl}/clients`),
        axios.get(`${baseUrl}/analysis`),
        axios.get(`${baseUrl}/network_info`)
      ]);
      
      const newClients = clientsRes.data;
      setData({ clients: newClients, analysis: analysisRes.data, network: networkRes.data });
      setLastUpdated(new Date().toLocaleTimeString());
      setLoading(false);

      // Check for new limited downloads
      newClients.forEach(c => {
        if (c.type === 'LIMITED' && c.size >= (5 * 1024 * 1024) - 1024 && !seenAlerts.current.has(c.id)) {
          seenAlerts.current.add(c.id);
          addAlert(`Client ${c.id} exceeded file size limit (5MB). Connection capped.`);
        }
      });

    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const addAlert = (message) => {
    const id = Date.now();
    setAlerts(prev => [...prev, { id, message }]);
    setTimeout(() => {
      setAlerts(prev => prev.filter(a => a.id !== id));
    }, 5000); // hide after 5 seconds
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [serverIp]);

  const handleIpChange = (e) => {
    e.preventDefault();
    setServerIp(inputIp);
    setLoading(true);
  };

  const handleExportCSV = () => {
    const headers = ["Client ID", "Status", "Type", "File Name", "Size (Bytes)", "Speed (B/s)", "Duration (s)", "Timestamp"];
    const rows = filteredClients.map(c => [
      c.id, c.status, c.type, c.file_name, c.size, c.speed, c.duration, c.time
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "network_logs.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredClients = data.clients.filter(c => filter === 'ALL' || c.type === filter);

  // Format routines
  const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    if (bytes >= 1024) return (bytes / 1024).toFixed(2) + " KB";
    return bytes + " B";
  };
  
  const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec) return "0 B/s";
    if (bytesPerSec >= 1024 * 1024) return (bytesPerSec / (1024 * 1024)).toFixed(2) + " MB/s";
    if (bytesPerSec >= 1024) return (bytesPerSec / 1024).toFixed(2) + " KB/s";
    return bytesPerSec.toFixed(2) + " B/s";
  };

  // Graph data preparation
  const graphData = useMemo(() => {
    const rev = [...data.clients].reverse();
    return rev.map(c => ({
      id: c.id,
      speed_full: c.type === 'FULL' ? c.speed : null,
      speed_limited: c.type === 'LIMITED' ? c.speed : null,
      rawClient: c
    }));
  }, [data.clients]);

  // Render Status Badge
  const StatusBadge = ({ status }) => {
    if (status === 'ACTIVE') return <span className="flex items-center text-amber-400 bg-amber-400/10 px-2 py-1 rounded text-xs font-bold ring-1 ring-amber-400/30 animate-pulse"><RefreshCw className="w-3 h-3 mr-1 animate-spin" /> ACTIVE</span>;
    if (status === 'COMPLETED') return <span className="flex items-center text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded text-xs font-bold ring-1 ring-emerald-400/30"><CheckCircle className="w-3 h-3 mr-1" /> COMPLETED</span>;
    return <span className="flex items-center text-rose-400 bg-rose-400/10 px-2 py-1 rounded text-xs font-bold ring-1 ring-rose-400/30"><XCircle className="w-3 h-3 mr-1" /> FAILED</span>;
  };

  // Render Type Badge
  const TypeBadge = ({ type }) => {
    if (type === 'LIMITED') return <span className="text-rose-400 bg-rose-400/10 border border-rose-400/30 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">LIMITED</span>;
    return <span className="text-emerald-400 bg-emerald-400/10 border border-emerald-400/30 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider">FULL</span>;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans relative">
      
      {/* Alert System Overlay */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {alerts.map(alert => (
          <div key={alert.id} className="bg-slate-800 border-l-4 border-amber-500 text-amber-300 p-4 rounded-xl shadow-2xl flex items-center transform transition-all translate-x-0 animate-bounce">
            <AlertTriangle className="mr-3" />
            <p className="font-medium text-sm">{alert.message}</p>
          </div>
        ))}
      </div>

      <div className="max-w-[1400px] mx-auto p-4 md:p-6 space-y-6">
        
        {/* Modern Header */}
        <div className="flex flex-col lg:flex-row justify-between items-center bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
          
          <div className="flex items-center space-x-5 z-10 w-full lg:w-auto">
            <div className="p-4 bg-gradient-to-br from-blue-500/20 to-emerald-500/20 text-blue-400 rounded-2xl shadow-inner border border-blue-500/10">
              <Activity size={32} className="animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-white tracking-tight">NetMonitor Pro</h1>
                <div className="px-2 py-0.5 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded text-xs font-bold animate-pulse flex items-center tracking-widest">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mr-1.5"></span> LIVE
                </div>
              </div>
              <p className="text-slate-400 font-medium text-sm mt-1">Automated Network Analytics Dashboard • Updated: <span className="text-slate-300">{lastUpdated || '...'}</span></p>
            </div>
          </div>

          <div className="mt-6 lg:mt-0 flex items-center space-x-3 bg-slate-950 p-1.5 rounded-xl border border-slate-800 z-10 w-full lg:w-auto self-end">
            <button 
              onClick={() => { setMode('LOCAL'); setServerIp('localhost:5001'); setInputIp('localhost:5001'); }} 
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'LOCAL' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <Monitor className="inline mr-2 w-4 h-4" /> Localhost
            </button>
            <button 
              onClick={() => { setMode('MANUAL'); }} 
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === 'MANUAL' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400 hover:text-white'}`}
            >
              <Settings className="inline mr-2 w-4 h-4" /> Multi-Client
            </button>
            
            {mode === 'MANUAL' && (
              <form onSubmit={handleIpChange} className="flex ml-2">
                <input 
                  type="text" 
                  value={inputIp} 
                  onChange={e => setInputIp(e.target.value)} 
                  className="bg-slate-900 border border-slate-700 text-white text-sm rounded-l-lg focus:ring-emerald-500 focus:border-emerald-500 block w-48 p-2 pb-2.5 outline-none font-mono"
                  placeholder="192.168.x.x:5001"
                />
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 px-4 font-semibold rounded-r-lg shadow-lg text-sm transition-colors">Connect</button>
              </form>
            )}
          </div>
        </div>

        {/* Network Topology & Info Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 glass-card p-6 flex flex-col justify-between">
            <div>
               <h2 className="text-slate-400 font-semibold mb-2 flex items-center"><Server className="mr-2 w-5 h-5 text-indigo-400"/> Server Info</h2>
               <div className="text-2xl font-mono font-bold text-white mb-4">{data.network.server_ip || '127.0.0.1'}</div>
               
               <div className="space-y-3 mt-6">
                 <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                   <span className="text-slate-400">Total Downloads</span>
                   <span className="font-bold text-blue-400">{data.network.total_clients || 0}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm border-b border-slate-800 pb-2">
                   <span className="text-slate-400">Active Connections</span>
                   <span className="font-bold text-amber-400 flex items-center">{data.network.active_clients || 0}</span>
                 </div>
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-slate-400">Network Mode</span>
                   <span className="font-bold text-indigo-400 uppercase">{data.network.mode || mode}</span>
                 </div>
               </div>
            </div>
          </div>

          <div className="lg:col-span-3 glass-card p-6 overflow-hidden relative">
             <h2 className="text-slate-400 font-semibold mb-4 flex items-center"><Activity className="mr-2 w-5 h-5 text-emerald-400"/> Network Topology & Active Traffic</h2>
             
             <div className="flex items-center justify-start space-x-6 h-32 overflow-x-auto custom-scrollbar">
                {/* Server Node */}
                <div className="min-w-[120px] h-20 bg-indigo-500/10 border border-indigo-500/30 rounded-xl flex items-center justify-center flex-col z-10 p-2 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                   <Server className="w-6 h-6 text-indigo-400 mb-1" />
                   <span className="text-xs font-bold text-indigo-300">MAIN SERVER</span>
                </div>
                
                {/* Visual Links */}
                {data.clients.slice(0, 6).map((c, idx) => (
                  <div key={idx} className="flex items-center space-x-6 relative group">
                     {/* Connecting Line with animated traffic pulse */}
                     <div className="w-16 h-0.5 bg-slate-700 relative">
                        {c.status === 'ACTIVE' && <div className="absolute inset-0 bg-amber-400 animate-[traffic_1s_linear_infinite]" style={{width: '20%'}}></div>}
                        {c.status === 'COMPLETED' && <div className="absolute inset-0 bg-emerald-500 rounded" style={{width: '100%', opacity: 0.5}}></div>}
                     </div>

                     {/* Client Node */}
                     <div className={`min-w-[110px] h-20 bg-slate-800 border ${c.type === 'LIMITED' ? 'border-rose-500/30' : 'border-emerald-500/30'} rounded-xl flex items-center justify-center flex-col p-2 transform group-hover:-translate-y-1 transition-transform relative`}>
                        {c.status === 'ACTIVE' && <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping"></div>}
                        <Monitor className={`w-5 h-5 ${c.type === 'LIMITED' ? 'text-rose-400' : 'text-emerald-400'} mb-1`} />
                        <span className="text-xs font-bold text-slate-300">Client {c.id}</span>
                        <div className="text-[9px] mt-1 text-slate-500 font-mono">{formatSpeed(c.speed)}</div>
                     </div>
                  </div>
                ))}
                
                {data.clients.length === 0 && <span className="text-slate-600 text-sm ml-8 italic">Waiting for connections...</span>}
             </div>
          </div>
        </div>

        {/* Global Analytics Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <StatCard title="Average Throughput" value={formatSpeed(data.analysis.avg_speed)} icon={<Zap className="text-blue-400" size={20} />} />
          <StatCard title="Peak Bandwidth" value={formatSpeed(data.analysis.max_speed)} icon={<Activity className="text-emerald-400" size={20} />} />
          <StatCard title="Minimum Flow" value={formatSpeed(data.analysis.min_speed)} icon={<ArrowDownToLine className="text-rose-400" size={20} />} />
          <StatCard title="Stress Point" value={data.analysis.busiest_time ? (data.analysis.busiest_time).split(" ")[1] : '--'} sub={data.analysis.busiest_time ? (data.analysis.busiest_time).split(" ")[0] : 'Idle'} icon={<Clock className="text-purple-400" size={20} />} />
        </div>

        {/* Graph & Bandwidth Vis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Advanced Graph */}
          <div className="lg:col-span-2 glass-card flex flex-col min-h-[400px]">
            <h2 className="text-lg font-bold mb-6 flex items-center text-slate-300 border-b border-slate-800 pb-4">
              <Activity className="mr-2 text-blue-500 w-5 h-5" /> Download Speed Variance
            </h2>
            <div className="flex-1 w-full relative">
              {graphData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={graphData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="id" stroke="#64748B" tick={{fill: '#64748B'}} tickLine={false} axisLine={false} />
                    <YAxis stroke="#64748B" tick={{fill: '#64748B'}} tickFormatter={(item) => (item/1024/1024).toFixed(1) + 'm/s'} tickLine={false} axisLine={false} />
                    
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#1E293B', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                      labelStyle={{ color: '#94A3B8', fontWeight: 'bold' }}
                      formatter={(value, name) => [formatSpeed(value), name === 'speed_full' ? 'FULL File' : 'LIMITED File']}
                      labelFormatter={(label) => `Client ID: ${label}`}
                    />
                    
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    <Line name="FULL Downloads" type="monotone" dataKey="speed_full" stroke="#10B981" strokeWidth={3} connectNulls dot={{r: 4, strokeWidth: 2, fill: '#0F172A', stroke: '#10B981'}} activeDot={{ r: 6, fill: '#10B981', stroke: '#fff' }} animationDuration={300} />
                    <Line name="LIMITED Downloads" type="monotone" dataKey="speed_limited" stroke="#F43F5E" strokeWidth={3} connectNulls dot={{r: 4, strokeWidth: 2, fill: '#0F172A', stroke: '#F43F5E'}} activeDot={{ r: 6, fill: '#F43F5E', stroke: '#fff' }} animationDuration={300} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                 <div className="absolute inset-0 flex justify-center items-center text-slate-600 gap-2 font-medium bg-slate-900/50 rounded-xl border border-slate-800/50"><RefreshCw className="animate-spin w-5 h-5" /> Waiting for analytics...</div>
              )}
            </div>
          </div>

          {/* Bandwidth Monitor */}
          <div className="glass-card flex flex-col h-[400px]">
            <h2 className="text-lg font-bold mb-4 flex flex-col border-b border-slate-800 pb-4">
              <span className="flex items-center text-slate-300"><Zap className="mr-2 text-amber-400 w-5 h-5" /> Live Bandwidth Usage</span>
              <span className="text-xs font-normal text-slate-500 mt-1">Per-client current throughput monitor</span>
            </h2>
            <div className="overflow-y-auto pr-2 space-y-5 flex-1 custom-scrollbar">
              {data.clients.slice(0, 8).map((client, idx) => {
                const maxSpd = data.analysis.max_speed || 1;
                const percentage = Math.min((client.speed / maxSpd) * 100, 100);
                return (
                 <div key={idx} className="space-y-2">
                   <div className="flex justify-between text-xs font-bold text-slate-400">
                     <span className="flex items-center gap-2">Client {client.id} {client.status === 'ACTIVE' && <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></div>}</span>
                     <span className="font-mono">{formatSpeed(client.speed)}</span>
                   </div>
                   <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                     <div 
                       className={`h-2.5 rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${client.type === 'LIMITED' ? 'from-rose-600 to-rose-400' : 'from-emerald-600 to-emerald-400'}`}
                       style={{ width: `${percentage}%` }}
                     ></div>
                   </div>
                 </div>
                );
              })}
              {data.clients.length === 0 && <div className="text-center text-slate-600 mt-10">No network activity yet.</div>}
            </div>
          </div>
        </div>

        {/* Traffic Log Table */}
        <div className="glass-card rounded-2xl overflow-hidden shadow-2xl">
           <div className="p-6 bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold flex items-center text-white">
                <Clock className="mr-2 text-indigo-400 w-6 h-6" /> Detailed Traffic Logs
              </h2>
              <p className="text-slate-500 text-sm mt-1">Complete historic record of all packet transfers.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
              <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800 w-full md:w-auto overflow-hidden">
                <FilterTab active={filter === 'ALL'} onClick={() => setFilter('ALL')} label="All Data" />
                <FilterTab active={filter === 'FULL'} onClick={() => setFilter('FULL')} label="Full" />
                <FilterTab active={filter === 'LIMITED'} onClick={() => setFilter('LIMITED')} label="Limited" />
              </div>

              <button onClick={handleExportCSV} className="bg-indigo-600/20 text-indigo-400 border border-indigo-600/30 font-semibold px-4 py-2 text-sm rounded-lg hover:bg-indigo-600 hover:text-white transition-all w-full md:w-auto flex justify-center items-center h-[38px]">
                 <Download className="w-4 h-4 mr-2" />
                 Download CSV
              </button>
            </div>
           </div>

           <div className="overflow-x-auto w-full bg-slate-950">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-slate-900/80 text-slate-400 shadow-sm whitespace-nowrap sticky top-0 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">Client ID</th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">State</th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">Type</th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">Target File</th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">Payload Size</th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider">Throughput</th>
                  <th className="px-6 py-4 font-semibold uppercase text-xs tracking-wider text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {filteredClients.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition-colors group whitespace-nowrap">
                    <td className="px-6 py-4 text-slate-300">#{log.id}</td>
                    <td className="px-6 py-4"><StatusBadge status={log.status} /></td>
                    <td className="px-6 py-4"><TypeBadge type={log.type} /></td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-xs">{log.file_name}</td>
                    <td className="px-6 py-4 text-slate-300 font-mono text-xs">{formatBytes(log.size)}</td>
                    <td className="px-6 py-4 text-blue-400 font-mono text-xs">{formatSpeed(log.speed)}</td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-xs text-right whitespace-nowrap">{log.time}</td>
                  </tr>
                ))}
                {filteredClients.length === 0 && (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                      <ShieldAlert className="w-10 h-10 mx-auto text-slate-700 mb-3" />
                      No logs matching the current filter parameters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
           </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .glass-card {
           background: rgba(15, 23, 42, 0.6);
           backdrop-filter: blur(12px);
           -webkit-backdrop-filter: blur(12px);
           border: 1px solid rgba(51, 65, 85, 0.4);
           border-radius: 1rem;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
          height: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 20px;
        }
        @keyframes traffic {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(500%); }
        }
      `}} />
    </div>
  );
};

// Subcomponents
const StatCard = ({ title, value, icon, sub }) => (
  <div className="glass-card p-5 relative overflow-hidden group hover:-translate-y-1 transition-transform cursor-default">
    <div className="flex justify-between items-start z-10 relative">
      <div>
        <h3 className="text-slate-500 font-semibold text-xs mb-1 tracking-wider uppercase">{title}</h3>
        <p className="text-xl md:text-2xl font-bold font-mono tracking-tight text-slate-100">{value}</p>
        {sub && <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wider">{sub}</p>}
      </div>
      <div className="p-2.5 bg-slate-900 rounded-xl group-hover:scale-110 group-hover:rotate-3 transition-transform shadow-inner border border-slate-800">
        {icon}
      </div>
    </div>
  </div>
);

const FilterTab = ({ active, onClick, label }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-1.5 text-xs font-bold rounded uppercase tracking-wider transition-colors flex-1 text-center ${active ? 'bg-slate-800 text-white shadow ring-1 ring-slate-700' : 'text-slate-500 hover:text-slate-300 hover:bg-slate-900/50'}`}
  >
    {label}
  </button>
);

export default App;
