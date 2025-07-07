
import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

function App() {
  const [token, setToken] = useState("");
  const [status, setStatus] = useState({});
  const [steps, setSteps] = useState([]);
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");

  const base = "http://localhost:8000";

  const login = async () => {
    const res = await axios.post(\`\${base}/login\`, new URLSearchParams({
      username,
      password
    }));
    setToken(res.data.access_token);
    loadSettings(res.data.access_token);
  };

  const loadSettings = async (t) => {
    const res = await axios.get(\`\${base}/settings\`, {
      headers: { Authorization: \`Bearer \${t}\` }
    });
    setSteps(res.data.steps);
  };

  const saveSettings = async () => {
    await axios.post(\`\${base}/settings\`, { steps }, {
      headers: { Authorization: \`Bearer \${token}\` }
    });
  };

  const runProcess = async () => {
    await axios.post(\`\${base}/run\`, {}, {
      headers: { Authorization: \`Bearer \${token}\` }
    });
  };

  const cancelProcess = async () => {
    await axios.post(\`\${base}/cancel\`, {}, {
      headers: { Authorization: \`Bearer \${token}\` }
    });
  };

  const pollStatus = async () => {
    const res = await axios.get(\`\${base}/status\`);
    setStatus(res.data);
  };

  useEffect(() => {
    const interval = setInterval(pollStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const updateStep = (i, field, value) => {
    const updated = [...steps];
    updated[i][field] = value;
    setSteps(updated);
  };

  const updateAction = (si, ai, field, value) => {
    const updated = [...steps];
    updated[si].actions[ai][field] = value;
    setSteps(updated);
  };

  const addAction = (si) => {
    const updated = [...steps];
    updated[si].actions.push({ relay: 0, state: "on" });
    setSteps(updated);
  };

  const addStep = () => {
    setSteps([...steps, { name: "New Step", actions: [], duration: 0 }]);
  };

  const deleteStep = (i) => {
    const updated = [...steps];
    updated.splice(i, 1);
    setSteps(updated);
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

          <h2>Steps</h2>
          {steps.map((step, i) => (
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
