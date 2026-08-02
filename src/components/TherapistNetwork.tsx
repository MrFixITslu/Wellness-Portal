import React, { useEffect, useState } from "react";
import { User, Therapist, Appointment } from "../types";
import { Search, MapPin, Award, Calendar, Clock, Star, ShieldCheck, CheckCircle2, UserPlus, FileText, ClipboardList } from "lucide-react";

interface TherapistProps {
  user: User;
}

export default function TherapistNetwork({ user }: TherapistProps) {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [countryFilter, setCountryFilter] = useState("all");

  // Registration form
  const [showRegForm, setShowRegForm] = useState(false);
  const [regName, setRegName] = useState("");
  const [regCountry, setRegCountry] = useState("Barbados");
  const [regCredentials, setRegCredentials] = useState("");
  const [regBio, setRegBio] = useState("");
  const [regSpecialties, setRegSpecialties] = useState("");

  // Booking Form
  const [activeTherapist, setActiveTherapist] = useState<Therapist | null>(null);
  const [bookDate, setBookDate] = useState("");
  const [bookSlot, setBookSlot] = useState("");
  const [bookNotes, setBookNotes] = useState("");

  const [success, setSuccess] = useState("");

  const loadTherapistData = async () => {
    try {
      const thRes = await fetch("/api/therapists");
      if (thRes.ok) setTherapists(await thRes.json());

      const appRes = await fetch(`/api/appointments?userId=${user.id}&isTherapist=${user.role === "therapist"}`);
      if (appRes.ok) setAppointments(await appRes.json());
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadTherapistData();
  }, [user.id, user.role]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");

    if (!regName.trim() || !regCredentials.trim()) {
      return alert("Please enter your name and credentials.");
    }

    try {
      const res = await fetch("/api/therapists/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          name: regName.trim(),
          country: regCountry,
          credentials: regCredentials.trim(),
          bio: regBio.trim(),
          specialties: regSpecialties.split(",").map((s) => s.trim()).filter(Boolean),
          availability_slots: ["Monday 10:00 AM", "Wednesday 1:00 PM", "Friday 3:00 PM"]
        })
      });

      if (res.ok) {
        setSuccess("Professional profile submitted successfully! Your clinical role is now activated.");
        setShowRegForm(false);
        setRegName("");
        setRegCredentials("");
        setRegBio("");
        setRegSpecialties("");
        // Reload
        loadTherapistData();
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to register");
      }
    } catch (err: any) {
      alert(err.message || "An error occurred.");
    }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess("");
    if (!activeTherapist || !bookDate || !bookSlot) {
      return alert("Please select a date and time slot.");
    }

    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          therapist_id: activeTherapist.id,
          date: bookDate,
          slot: bookSlot,
          notes: bookNotes.trim()
        })
      });

      if (res.ok) {
        setSuccess(`Appointment request sent to ${activeTherapist.name}.`);
        setActiveTherapist(null);
        setBookDate("");
        setBookSlot("");
        setBookNotes("");
        loadTherapistData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateApptStatus = async (apptId: string, status: Appointment["status"]) => {
    try {
      const res = await fetch(`/api/appointments/${apptId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, updaterId: user.id })
      });
      if (res.ok) {
        setSuccess("Appointment status updated successfully.");
        loadTherapistData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredTherapists = therapists.filter((t) => {
    const matchesCountry = countryFilter === "all" || t.country === countryFilter;
    const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.bio.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          t.specialties.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCountry && matchesSearch;
  });

  return (
    <div id="therapists-container" className="space-y-6 max-w-5xl mx-auto">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 id="therapists-title" className="text-xl font-semibold tracking-tight text-[#0F4C81]">Therapist Network Hub</h1>
          <p id="therapists-desc" className="text-slate-500 text-xs">
            Connect anonymously with licensed professional clinical psychologists, counselors, and psychiatrists across the Caribbean.
          </p>
        </div>

        {user.role !== "therapist" && (
          <button
            id="btn-toggle-reg-form"
            onClick={() => setShowRegForm(!showRegForm)}
            className="px-4 py-2 border border-[#00A896] text-[#00A896] hover:bg-[#00A896]/5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" /> Are you a licensed practitioner? Register here
          </button>
        )}
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" />
          <span>{success}</span>
        </div>
      )}

      {/* View 1: Clinical Registration form overlay */}
      {showRegForm && (
        <div className="bg-white border border-[#EBE3D5] rounded-2xl p-6 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
            <FileText className="w-5 h-5 text-[#0F4C81]" /> Licensed Therapist Profile Intake Form
          </h3>
          <p className="text-xs text-slate-500">Provide your credentials and professional specialties. Verification is completed anonymously.</p>

          <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Full Name & Title</label>
              <input
                type="text"
                placeholder="e.g. Dr. Alana Clarke, PhD"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full px-3.5 py-2 border border-[#EBE3D5] rounded-xl text-xs bg-slate-50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Territory of License</label>
              <select
                value={regCountry}
                onChange={(e) => setRegCountry(e.target.value)}
                className="w-full px-3.5 py-2 border border-[#EBE3D5] rounded-xl text-xs bg-slate-50"
              >
                <option value="Barbados">Barbados</option>
                <option value="Jamaica">Jamaica</option>
                <option value="Saint Lucia">Saint Lucia</option>
                <option value="Trinidad & Tobago">Trinidad & Tobago</option>
                <option value="Guyana">Guyana</option>
              </select>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Clinical Credentials & Degrees</label>
              <input
                type="text"
                placeholder="e.g. Doctor of Philosophy in Clinical Psychology, University of the West Indies, 2014"
                value={regCredentials}
                onChange={(e) => setRegCredentials(e.target.value)}
                className="w-full px-3.5 py-2 border border-[#EBE3D5] rounded-xl text-xs bg-slate-50"
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Specialties (comma separated)</label>
              <input
                type="text"
                placeholder="e.g. CBT, Anxiety, Storm Trauma, Family Counseling, Stress Management"
                value={regSpecialties}
                onChange={(e) => setRegSpecialties(e.target.value)}
                className="w-full px-3.5 py-2 border border-[#EBE3D5] rounded-xl text-xs bg-slate-50"
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-slate-600">Clinical Bio Summary</label>
              <textarea
                rows={4}
                placeholder="Briefly describe your treatment approach, community work, or clinical background in our region."
                value={regBio}
                onChange={(e) => setRegBio(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-[#EBE3D5] rounded-xl text-xs bg-slate-50"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowRegForm(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#00A896] hover:bg-[#02C39A] text-white rounded-xl text-xs font-semibold"
              >
                Activate Clinical Therapist Account
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main network query panel */}
      <div id="therapist-workspace-grid" className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Therapists Catalog */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white border border-[#EBE3D5] rounded-2xl p-4 flex flex-col sm:flex-row justify-between gap-3 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search specialists or specialties..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-[#EBE3D5] rounded-xl text-slate-800 focus:outline-none text-xs"
              />
            </div>

            <select
              value={countryFilter}
              onChange={(e) => setCountryFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-[#EBE3D5] rounded-xl text-xs text-slate-700 focus:outline-none"
            >
              <option value="all">All Territories</option>
              <option value="Barbados">Barbados</option>
              <option value="Jamaica">Jamaica</option>
              <option value="Saint Lucia">Saint Lucia</option>
              <option value="Trinidad & Tobago">Trinidad & Tobago</option>
              <option value="Guyana">Guyana</option>
            </select>
          </div>

          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {filteredTherapists.length === 0 ? (
              <div className="p-8 bg-white border border-[#EBE3D5] rounded-2xl text-center text-slate-400 text-xs italic">
                No matching licensed clinical practitioners found. Adjust filter variables.
              </div>
            ) : (
              filteredTherapists.map((ther) => (
                <div key={ther.id} className="bg-white border border-[#EBE3D5] rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <h3 className="font-semibold text-slate-800 text-xs">{ther.name}</h3>
                        <span className="text-[9px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <ShieldCheck className="w-3 h-3 inline" /> Verified
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-red-500" /> <span>{ther.country}</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-0.5">
                      ★ {ther.rating}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{ther.bio}</p>

                  <div className="flex flex-wrap gap-1">
                    {ther.specialties.map((s) => (
                      <span key={s} className="text-[9px] font-semibold bg-slate-50 text-slate-500 border border-slate-100 px-2 py-0.5 rounded-full">
                        {s}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pt-3 border-t border-slate-50">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Award className="w-3.5 h-3.5" /> {ther.credentials}
                    </span>

                    {user.id !== ther.user_id && (
                      <button
                        onClick={() => {
                          setSuccess("");
                          setActiveTherapist(ther);
                        }}
                        className="px-4 py-1.5 bg-[#0F4C81] hover:bg-[#1D70B8] text-white text-[11px] font-semibold rounded-xl transition-all"
                      >
                        Request Appointment
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Column: Appointment Scheduler Or Current Bookings */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Appointment request panel */}
          {activeTherapist && (
            <div className="bg-[#FBF8F3] border border-amber-100 rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4.5 h-4.5 text-amber-700 animate-bounce" /> Request Appointment Slot
              </h3>
              <p className="text-xs text-slate-600">Booking with <strong>{activeTherapist.name}</strong></p>

              <form onSubmit={handleBook} className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">Select Date</label>
                  <input
                    type="date"
                    value={bookDate}
                    onChange={(e) => setBookDate(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 bg-white border border-[#EBE3D5] rounded-xl text-xs text-slate-800"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">Select Available Hour</label>
                  <select
                    value={bookSlot}
                    onChange={(e) => setBookSlot(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 bg-white border border-[#EBE3D5] rounded-xl text-xs text-slate-800"
                  >
                    <option value="">-- Choose a slot --</option>
                    {activeTherapist.availability_slots.map((sl) => (
                      <option key={sl} value={sl}>{sl}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">Confidential Notes (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Briefly state symptoms (e.g. general anxiety). Note: this is encrypted."
                    value={bookNotes}
                    onChange={(e) => setBookNotes(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-[#EBE3D5] rounded-xl text-xs text-slate-800"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTherapist(null)}
                    className="flex-1 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold bg-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-1.5 bg-[#0F4C81] hover:bg-[#1D70B8] text-white rounded-xl text-xs font-semibold"
                  >
                    Book Slot
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Appointments list */}
          <div className="bg-white border border-[#EBE3D5] rounded-2xl p-5 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList className="w-4.5 h-4.5 text-[#00A896]" /> Requested Appointments
            </h3>

            {appointments.length === 0 ? (
              <p className="text-slate-400 text-xs italic">No clinical slots booked yet.</p>
            ) : (
              <div className="space-y-3">
                {appointments.map((appt) => (
                  <div key={appt.id} className="p-3 bg-[#FBF8F3] border border-[#EBE3D5] rounded-xl text-xs space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-600">ID: {appt.id.substring(0,8)}</span>
                      <span className={`font-bold uppercase px-1.5 py-0.5 rounded text-[8px] ${
                        appt.status === "confirmed" ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : appt.status === "cancelled" ? "bg-red-50 text-red-600"
                          : "bg-amber-50 text-amber-700"
                      }`}>
                        {appt.status}
                      </span>
                    </div>

                    <div className="flex justify-between font-semibold text-slate-700 text-[11px]">
                      <span>{user.role === "therapist" ? `Patient: ${appt.user_name}` : `Therapist: ${appt.therapist_name}`}</span>
                      <span className="text-[#0F4C81]">{appt.slot}</span>
                    </div>

                    <p className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Booked: {appt.date}
                    </p>

                    {appt.notes && (
                      <p className="text-[10px] text-slate-500 italic border-t border-slate-100/50 pt-1">Notes: {appt.notes}</p>
                    )}

                    {/* Therapist Controls */}
                    {user.role === "therapist" && appt.status === "requested" && (
                      <div className="flex gap-2 pt-1">
                        <button
                          onClick={() => handleUpdateApptStatus(appt.id, "confirmed")}
                          className="flex-1 py-1 bg-emerald-600 text-white rounded font-semibold text-[9px] hover:bg-emerald-700"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => handleUpdateApptStatus(appt.id, "cancelled")}
                          className="flex-1 py-1 bg-red-600 text-white rounded font-semibold text-[9px] hover:bg-red-700"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
