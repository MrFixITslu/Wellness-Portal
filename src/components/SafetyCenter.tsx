import React, { useState, useEffect } from "react";
import { ShieldAlert, Activity, Phone, Compass, HelpCircle, Heart, Star, Flame, Eye } from "lucide-react";

interface EmergencyContact {
  country: string;
  name: string;
  number: string;
  availability: string;
}

const EMERGENCY_CONTACTS: EmergencyContact[] = [
  { country: "Barbados", name: "National Mental Health Crisis Line", number: "536-3091", availability: "Mon-Fri, 8AM - 4PM" },
  { country: "Barbados", name: "Samaritans Barbados", number: "(246) 429-9999", availability: "24/7 Helpline" },
  { country: "Jamaica", name: "Mental Health Unit Crisis Line", number: "888-NEW-LIFE (888-639-5433)", availability: "24/7 Helpline" },
  { country: "Jamaica", name: "National Emergency Services", number: "119", availability: "24/7 Emergency" },
  { country: "Saint Lucia", name: "Suicide Crisis Hotline", number: "203", availability: "24/7 Helpline" },
  { country: "Saint Lucia", name: "Mental Wellness Hospital", number: "458-5900", availability: "24/7 Line" },
  { country: "Trinidad & Tobago", name: "Lifeline T&T", number: "800-5588 / (868) 645-2800", availability: "24/7 Helpline" },
  { country: "Trinidad & Tobago", name: "Childline (Under 25)", number: "131", availability: "24/7 Helpline" },
  { country: "Guyana", name: "Suicide Prevention Hotline", number: "223-0001 / 223-0009", availability: "24/7 Emergency" }
];

export default function SafetyCenter() {
  const [activeCountryFilter, setActiveCountryFilter] = useState("all");
  
  // Breathing state
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingPhase, setBreathingPhase] = useState<"inhale" | "hold_in" | "exhale" | "hold_out">("inhale");
  const [timeLeft, setTimeLeft] = useState(4); // seconds in current phase

  // Box breathing intervals:
  // Inhale 4s, Hold 4s, Exhale 6s, Hold 2s
  useEffect(() => {
    let timer: any;
    if (breathingActive) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Transition phases
            if (breathingPhase === "inhale") {
              setBreathingPhase("hold_in");
              return 4; // hold for 4
            } else if (breathingPhase === "hold_in") {
              setBreathingPhase("exhale");
              return 6; // exhale for 6
            } else if (breathingPhase === "exhale") {
              setBreathingPhase("hold_out");
              return 2; // hold empty for 2
            } else {
              setBreathingPhase("inhale");
              return 4; // inhale for 4
            }
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setBreathingPhase("inhale");
      setTimeLeft(4);
    }

    return () => clearInterval(timer);
  }, [breathingActive, breathingPhase]);

  const getPhaseInstruction = () => {
    switch (breathingPhase) {
      case "inhale":
        return { text: "Inhale slowly", detail: "Inhale fresh ocean air... fill your chest.", color: "text-[#163A2E]", scale: "scale-125" };
      case "hold_in":
        return { text: "Hold your breath", detail: "Feel the calm expand inside you.", color: "text-amber-600", scale: "scale-125" };
      case "exhale":
        return { text: "Exhale gently", detail: "Let the stress roll out like the tide.", color: "text-[#158A80]", scale: "scale-90" };
      case "hold_out":
        return { text: "Rest empty", detail: "Acknowledge the space and quiet.", color: "text-slate-500", scale: "scale-90" };
    }
  };

  const instruction = getPhaseInstruction();

  const filteredContacts = activeCountryFilter === "all"
    ? EMERGENCY_CONTACTS
    : EMERGENCY_CONTACTS.filter(c => c.country === activeCountryFilter);

  return (
    <div id="safety-center-container" className="space-y-6 max-w-4xl mx-auto">
      
      {/* Title */}
      <div className="space-y-1">
        <h1 id="safety-title" className="text-xl font-semibold tracking-tight text-[#163A2E]">Crisis & Safety Center</h1>
        <p id="safety-desc" className="text-slate-500 text-xs">
          Always available. Access immediate free telephone helplines across the Caribbean or try our structured physical grounding guides.
        </p>
      </div>

      <div id="safety-cols" className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Left: Grounding Guides */}
        <div className="md:col-span-6 space-y-6">
          
          {/* Interactive Breathing Guide */}
          <div className="bg-white border border-[#E3D8BF] rounded-2xl p-6 space-y-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#158A80]" /> Interactive Breathing Guide
            </h3>
            <p className="text-xs text-slate-500">
              Box breathing is a clinically-proven method to lower stress levels and steady heart rates during high anxiety episodes.
            </p>

            {/* Breathing Animator Circle */}
            <div className="flex flex-col items-center justify-center py-6 space-y-4">
              <div className="relative flex items-center justify-center w-40 h-40">
                {/* Outer halo background */}
                <div className={`absolute inset-0 rounded-full border-2 border-dashed border-slate-100 transition-transform duration-1000 ${
                  breathingActive ? instruction.scale : "scale-100"
                }`} />

                {/* Main animating bubble */}
                <div className={`w-32 h-32 rounded-full flex flex-col items-center justify-center transition-all duration-1000 ${
                  breathingActive 
                    ? breathingPhase === "inhale" ? "bg-[#163A2E]/10 text-[#163A2E] scale-110"
                      : breathingPhase === "hold_in" ? "bg-amber-150 text-amber-700 scale-110"
                      : "bg-[#158A80]/10 text-[#158A80] scale-100"
                    : "bg-slate-50 text-slate-400"
                }`}>
                  <span className="text-xl font-bold">{timeLeft}s</span>
                  <span className="text-[10px] font-bold tracking-wider uppercase mt-1">
                    {breathingActive ? breathingPhase.replace("_", " ") : "Ready"}
                  </span>
                </div>
              </div>

              {/* Instructions text */}
              <div className="text-center min-h-[50px] px-4">
                <h4 className={`text-sm font-bold ${instruction.color}`}>
                  {breathingActive ? instruction.text : "Anchor Your Breathing"}
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {breathingActive ? instruction.detail : "Click start below to begin box-breathing guided by waves metaphors."}
                </p>
              </div>

              {/* Button */}
              <button
                id="btn-breathing-control"
                onClick={() => setBreathingActive(!breathingActive)}
                className={`px-6 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                  breathingActive 
                    ? "bg-[#163A2E] hover:bg-[#1FA396] text-white" 
                    : "bg-[#158A80] hover:bg-[#1FA396] text-white"
                }`}
              >
                {breathingActive ? "Pause Guide" : "Start Beachwave Breathing"}
              </button>
            </div>
          </div>

          {/* 5-4-3-2-1 Grounding Checklist */}
          <div className="bg-white border border-[#E3D8BF] rounded-2xl p-6 space-y-4 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#163A2E]" /> The Sensory Grounding Anchor
            </h3>
            <p className="text-xs text-slate-500 leading-normal">
              When panic or storm memories pull you into a spiral, focus fully on your immediate physical surroundings to steady your mind:
            </p>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="p-2.5 bg-slate-50 rounded-xl flex items-start gap-2.5">
                <span className="bg-[#163A2E] text-white font-bold px-2 py-0.5 rounded text-[10px]">5</span>
                <div><strong>Look closely around you</strong>: Name 5 objects in your sight (e.g., table, light beam, leaf outside).</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl flex items-start gap-2.5">
                <span className="bg-[#158A80] text-white font-bold px-2 py-0.5 rounded text-[10px]">4</span>
                <div><strong>Touch tactile anchors</strong>: Touch 4 distinct surfaces (e.g., cool wood, rough fabric, your own arm).</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl flex items-start gap-2.5">
                <span className="bg-amber-600 text-white font-bold px-2 py-0.5 rounded text-[10px]">3</span>
                <div><strong>Listen carefully</strong>: Focus and identify 3 external sounds (e.g., breeze, birds, car hum).</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl flex items-start gap-2.5">
                <span className="bg-rose-600 text-white font-bold px-2 py-0.5 rounded text-[10px]">2</span>
                <div><strong>Smell</strong>: Search for 2 scents in your immediate space (e.g., soap, salt breeze, coffee).</div>
              </div>
              <div className="p-2.5 bg-slate-50 rounded-xl flex items-start gap-2.5">
                <span className="bg-blue-600 text-white font-bold px-2 py-0.5 rounded text-[10px]">1</span>
                <div><strong>Taste</strong>: Bring your focus to 1 physical taste (e.g., simple drink of water, mint).</div>
              </div>
            </div>
          </div>

        </div>

        {/* Right: National Crisis Lines */}
        <div className="md:col-span-6 bg-white border border-[#E3D8BF] rounded-2xl p-6 space-y-4 shadow-sm h-fit">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Phone className="w-5 h-5 text-red-600 animate-pulse" /> National Crisis Helplines
            </h3>

            {/* Country Selector Filter */}
            <select
              value={activeCountryFilter}
              onChange={(e) => setActiveCountryFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-[#E3D8BF] rounded-xl text-xs bg-slate-50 focus:outline-none"
            >
              <option value="all">All Territories</option>
              <option value="Barbados">Barbados</option>
              <option value="Jamaica">Jamaica</option>
              <option value="Saint Lucia">Saint Lucia</option>
              <option value="Trinidad & Tobago">Trinidad & Tobago</option>
              <option value="Guyana">Guyana</option>
            </select>
          </div>

          <p className="text-xs text-slate-500 leading-normal">
            If you are in immediate distress or having thoughts of suicide, please pick up the phone and dial one of these confidential, cost-free, clinical support networks.
          </p>

          <div className="space-y-3">
            {filteredContacts.map((contact, idx) => (
              <div
                key={idx}
                className="p-3.5 bg-red-50/50 hover:bg-red-50/80 border border-red-100 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-extrabold uppercase bg-red-100 text-red-800 px-1.5 py-0.5 rounded">
                      {contact.country}
                    </span>
                    <span className="font-semibold text-slate-700">{contact.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block">{contact.availability}</span>
                </div>

                <a
                  href={`tel:${contact.number.split("/")[0].trim()}`}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-center rounded-xl transition-colors shrink-0"
                >
                  Dial {contact.number.split("/")[0].trim()}
                </a>
              </div>
            ))}
          </div>

          {/* Non-local warning disclaimer */}
          <div className="bg-slate-50 p-3 rounded-xl text-[10px] text-slate-400 text-center">
            Are you outside these islands? Please reach out to your local hospital emergency room or contact your nearest qualified mental health clinic.
          </div>
        </div>

      </div>

    </div>
  );
}
