import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState({});
  const [config, setConfig] = useState({
    steps: [],
    schedule: { days_of_week: [], every_x_days: 1 },
    trigger_mode: "internal",
    last_run: null
  });
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");

  const base = "http://localhost:8000";

  const login = async () => {
    const res = await axios.post(`${base}/login`, new URLSearchParams({
      username,
      password
    }));
    setToken(res.data.access_token);
    loadSettings(res.data.access_token);
  };

  const loadSettings = async (t) => {
    const res = await axios.get(`${base}/settings`, {
      headers: { Authorization: `Bearer ${t}` }
    });
    setConfig(res.data);
  };

  const saveSettings = async () => {
    await axios.post(`${base}/settings`, config, {
      headers: { Authorization: `Bearer ${token}` }
    });
  };

  const runProcess = async () => {
    await axios.post(`${base}/run`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
  };

  const cancelProcess = async () => {
    await axios.post(`${base}/cancel`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
  };

  const pollStatus = async () => {
    const res = await axios.get(`${base}/status`);
    setStatus(res.data);
  };

  useEffect(() => {
    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  // Step/Action helpers operate on config.steps
  const updateStep = (i, field, value) => {
    const updated = [...config.steps];
    updated[i][field] = value;
    setConfig({ ...config, steps: updated });
  };

  const updateAction = (si, ai, field, value) => {
    const updated = [...config.steps];
    updated[si].actions[ai][field] = value;
    setConfig({ ...config, steps: updated });
  };

  const addAction = (si) => {
    const updated = [...config.steps];
    updated[si].actions.push({ relay: 0, state: "on" });
    setConfig({ ...config, steps: updated });
  };

  const addStep = () => {
    setConfig({ ...config, steps: [...config.steps, { name: "New Step", actions: [], duration: 0 }] });
  };

  const deleteStep = (i) => {
    const updated = [...config.steps];
    updated.splice(i, 1);
    setConfig({ ...config, steps: updated });
  };

  // Handle schedule and trigger_mode changes
  const handleTriggerModeChange = (e) => {
    setConfig({ ...config, trigger_mode: e.target.value });
  };

  const handleDaysOfWeekChange = (e) => {
    setConfig({
      ...config,
      schedule: {
        ...config.schedule,
        days_of_week: e.target.value.split(",").map(d => d.trim()).filter(Boolean)
      }
    });
  };

  const handleEveryXDaysChange = (e) => {
    setConfig({
      ...config,
      schedule: {
        ...config.schedule,
        every_x_days: parseInt(e.target.value) || 1
      }
    });
  };

  return (
    <div className="App">
      {!token ? (
        <div>
          <h2>Login</h2>
          <input value={username} onChange={e => setUsername(e.target.value)} placeholder="username" />
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="password" />
          <button onClick={login}>Login</button>
        </div>
      ) : (
        <div>
          <h1>Nexus Cleaning Controller</h1>
          <p>Status: {status.running ? "Running" : "Idle"}</p>
          <p>Current Step: {status.step}</p>

          <button onClick={runProcess}>Run Now</button>
          <button onClick={cancelProcess}>Cancel</button>

          <h2>Schedule</h2>
          <div>
            <label>
              <input
                type="radio"
                name="trigger_mode"
                value="internal"
                checked={config.trigger_mode === "internal"}
                onChange={handleTriggerModeChange}
              /> Internal Schedule
            </label>
            <label>
              <input
                type="radio"
                name="trigger_mode"
                value="api"
                checked={config.trigger_mode === "api"}
                onChange={handleTriggerModeChange}
              /> Home Assistant / REST API Automation
            </label>
            <label>
              <input
                type="radio"
                name="trigger_mode"
                value="both"
                checked={config.trigger_mode === "both"}
                onChange={handleTriggerModeChange}
              /> Both
            </label>
          </div>
          {(config.trigger_mode === "internal" || config.trigger_mode === "both") && (
            <div>
              <label>
                Days of week: <input
                  type="text"
                  value={config.schedule.days_of_week ? config.schedule.days_of_week.join(", ") : ""}
                  onChange={handleDaysOfWeekChange}
                  placeholder="e.g. Monday, Wednesday"
                />
              </label>
              <label>
                Every X days: <input
                  type="number"
                  value={config.schedule.every_x_days || 1}
                  onChange={handleEveryXDaysChange}
                  min="1"
                />
              </label>
            </div>
          )}

          <h2>Steps</h2>
          {config.steps.map((step, i) => (
            <div key={i} style={{ border: "1px solid #ccc", padding: "10px", marginBottom: "10px" }}>
              <input value={step.name} onChange={e => updateStep(i, "name", e.target.value)} placeholder="Step name" />
              <input type="number" value={step.duration} onChange={e => updateStep(i, "duration", parseInt(e.target.value))} placeholder="Duration (s)" />
              <button onClick={() => addAction(i)}>Add Action</button>
              <button onClick={() => deleteStep(i)}>Delete Step</button>
              {step.actions.map((action, j) => (
                <div key={j} style={{ marginLeft: "20px" }}>
                  Relay: <select value={action.relay} onChange={e => updateAction(i, j, "relay", parseInt(e.target.value))}>
                    {[0, 1, 2, 3].map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  State: <select value={action.state} onChange={e => updateAction(i, j, "state", e.target.value)}>
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </select>
                </div>
              ))}
            </div>
          ))}
          <button onClick={addStep}>Add Step</button>
          <button onClick={saveSettings}>Save Settings</button>
        </div>
      )}
    </div>
  );
}

export default App;
