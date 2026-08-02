import React, { useEffect, useState } from "react";
import { User, Report, SafetyEvent, AuditLog } from "../types";
import { ShieldAlert, AlertTriangle, Eye, Check, Trash2, ShieldCheck, ListFilter, ClipboardList, Database, HeartHandshake } from "lucide-react";

interface ModeratorProps {
  user: User;
}

export default function ModeratorPanel({ user }: ModeratorProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [safetyEvents, setSafetyEvents] = useState<SafetyEvent[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"reports" | "safety" | "audits">("reports");
  const [success, setSuccess] = useState("");

  const loadModData = async () => {
    try {
      const repRes = await fetch("/api/admin/reports");
      if (repRes.ok) setReports(await repRes.json());

      const safRes = await fetch("/api/admin/safety-events");
      if (safRes.ok) setSafetyEvents(await safRes.json());

      const audRes = await fetch("/api/admin/audit-logs");
      if (audRes.ok) setAuditLogs(await audRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (user.role !== "moderator") return;
    loadModData();
  }, [user.id, user.role]);

  const handleResolveReport = async (reportId: string, status: Report["status"]) => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, moderatorId: user.id })
      });

      if (res.ok) {
        setSuccess(`Report ${reportId.substring(0,8)} marked as ${status}.`);
        loadModData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExecuteAction = async (targetId: string, type: "delete" | "suspend" | "warn") => {
    const reason = window.prompt(`Enter reason for taking moderation action (${type}):`);
    if (!reason || !reason.trim()) return;

    try {
      const res = await fetch("/api/admin/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          moderatorId: user.id,
          action_type: type,
          target_id: targetId,
          reason: reason.trim()
        })
      });

      if (res.ok) {
        setSuccess(`Moderation action (${type}) executed on target successfully.`);
        loadModData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (user.role !== "moderator") {
    return (
      <div className="p-8 text-center max-w-lg mx-auto space-y-4">
        <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-800">Access Restricted</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          This portal is strictly reserved for certified clinical moderators and safety administrators. To test this view, register an anonymous user and enter the moderator access code: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-bold">carib-mod-2026</code>.
        </p>
      </div>
    );
  }

  return (
    <div id="moderator-panel-container" className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="space-y-1">
        <h1 id="mod-title" className="text-xl font-semibold tracking-tight text-[#0F4C81]">Clinical Moderation Console</h1>
        <p id="mod-desc" className="text-slate-500 text-xs">
          Maintain regional support health, resolve reported content, audit system events, and track AI-intercepted crisis risks.
        </p>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl">
          {success}
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab("reports")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === "reports"
              ? "border-[#00A896] text-[#00A896]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> Reports Queue ({reports.filter(r => r.status === "pending").length})
        </button>

        <button
          onClick={() => setActiveSubTab("safety")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === "safety"
              ? "border-[#00A896] text-[#00A896]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <HeartHandshake className="w-4 h-4" /> AI Safety Intercepts ({safetyEvents.length})
        </button>

        <button
          onClick={() => setActiveSubTab("audits")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeSubTab === "audits"
              ? "border-[#00A896] text-[#00A896]"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Database className="w-4 h-4" /> Clinical Audit Log ({auditLogs.length})
        </button>
      </div>

      {/* Main Workspace based on Active Sub-Tab */}
      <div className="bg-white border border-[#EBE3D5] rounded-2xl p-6 shadow-sm">
        
        {/* VIEW 1: USER REPORTS */}
        {activeSubTab === "reports" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-800">Pending User Reports</h3>
            
            {reports.length === 0 ? (
              <p className="text-slate-400 text-xs italic">No reports filed in the system. Great job!</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2.5 px-3">Reporter</th>
                      <th className="py-2.5 px-3">Reason</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Target ID</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.map((rep) => (
                      <tr key={rep.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                        <td className="py-3 px-3 font-semibold text-slate-800">@{rep.reporter_id.substring(0,8)}</td>
                        <td className="py-3 px-3">
                          <span className="font-medium block text-slate-700">{rep.reason}</span>
                          <span className="text-[10px] text-slate-400 block">{rep.details || "No additional comments"}</span>
                        </td>
                        <td className="py-3 px-3 uppercase text-[10px] font-bold text-slate-400">{rep.content_type}</td>
                        <td className="py-3 px-3 font-mono text-[10px] text-slate-400">{rep.target_id.substring(0,8)}</td>
                        <td className="py-3 px-3">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            rep.status === "pending" ? "bg-amber-50 text-amber-800"
                              : "bg-emerald-50 text-emerald-800"
                          }`}>
                            {rep.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          {rep.status === "pending" && (
                            <div className="flex justify-end gap-1.5">
                              <button
                                onClick={() => handleResolveReport(rep.id, "reviewed")}
                                className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-[10px] font-semibold hover:bg-slate-200"
                              >
                                Dismiss
                              </button>
                              <button
                                onClick={() => {
                                  handleExecuteAction(rep.target_id, "delete");
                                  handleResolveReport(rep.id, "action_taken");
                                }}
                                className="px-2 py-1 bg-red-600 text-white rounded text-[10px] font-semibold hover:bg-red-700"
                              >
                                Delete Item
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: AI SAFETY PIPELINE EVENTS */}
        {activeSubTab === "safety" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-red-600" /> Automated Safety Pipeline Intercepts
            </h3>
            <p className="text-xs text-slate-500">
              The platform utilizes standard text parsing and AI models to detect high risk scores (suicidal ideation, self-harm, extreme domestic violence) to intervene instantly with supportive regional assets.
            </p>

            {safetyEvents.length === 0 ? (
              <p className="text-slate-400 text-xs italic">No high-risk pipeline incidents recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {safetyEvents.map((evt) => (
                  <div key={evt.id} className="p-4 bg-red-50/40 border border-red-100 rounded-xl text-xs space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold uppercase text-[9px] bg-red-100 text-red-800 px-2 py-0.5 rounded">
                          {evt.event_type}
                        </span>
                        <span className="text-[10px] text-slate-400">User: @{evt.user_id.substring(0,8)}</span>
                      </div>
                      <span className="font-bold text-red-600 bg-red-100/50 px-2 py-0.5 rounded text-[10px]">
                        Risk Score: {evt.risk_score}/5
                      </span>
                    </div>

                    <div className="bg-white p-3 border border-red-50 rounded-lg">
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Snippet:</p>
                      <p className="text-slate-600 italic mt-0.5">"{evt.content_snippet}"</p>
                    </div>

                    <div className="text-slate-500 text-[11px] flex items-center gap-1">
                      <span><strong>Action Triggered:</strong> {evt.action_taken}</span>
                    </div>

                    <div className="text-[10px] text-slate-400 text-right">
                      {new Date(evt.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: CLINICAL SYSTEM AUDIT LOGS */}
        {activeSubTab === "audits" && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-[#00A896]" /> HIPAA System Compliance Trails
            </h3>
            <p className="text-xs text-slate-500">
              To guarantee zero leakages, this immutable log records all account registrations, counseling registrations, reporting files, and clinical access requests with IP masking.
            </p>

            {auditLogs.length === 0 ? (
              <p className="text-slate-400 text-xs italic">No system audit trails available yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 text-slate-400 font-bold uppercase text-[10px]">
                      <th className="py-2 px-3">User ID</th>
                      <th className="py-2 px-3">Action</th>
                      <th className="py-2 px-3">Description</th>
                      <th className="py-2 px-3">IP Address</th>
                      <th className="py-2 px-3 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 text-[11px]">
                        <td className="py-2 px-3 text-slate-500">@{log.user_id.substring(0,8)}</td>
                        <td className="py-2 px-3 font-semibold text-teal-800">{log.action}</td>
                        <td className="py-2 px-3 text-slate-600">{log.details}</td>
                        <td className="py-2 px-3 font-mono text-slate-400">{log.ip_address}</td>
                        <td className="py-2 px-3 text-right text-slate-400">{new Date(log.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>

    </div>
  );
}
