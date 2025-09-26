import React, { useState, useEffect } from "react";
import axios from "axios";
/* global NDEFReader */

const API_URL = "https://nfc-reader-backend-6iwh.onrender.com/api";
// const API_URL = "http://localhost:5000";

function App() {
  const [tapHistory, setTapHistory] = useState([]);
  const [error, setError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [nfcReader, setNfcReader] = useState(null);

  // Load tap history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const response = await axios.get(`${API_URL}/taps`);
        setTapHistory(response.data);
      } catch (err) {
        console.error("Error loading tap history:", err);
        setError("Failed to load tap history");
      }
    };

    loadHistory();
  }, []);

  // Handle NFC reading when nfcReader changes
  useEffect(() => {
    if (!nfcReader) return;

    // This will fire when any NFC tag is detected
    nfcReader.onreading = async (event) => {
      const tagData = {
        timestamp: new Date().toISOString(),
        serialNumber: event.serialNumber || "unknown",
        tagType: "unknown",
        hasNdef: false,
      };

      // Try to get basic tag info
      if (event.message?.records?.length > 0) {
        tagData.hasNdef = true;
        tagData.recordCount = event.message.records.length;
        tagData.recordTypes = [
          ...new Set(event.message.records.map((r) => r.recordType)),
        ];
      }

      // Try to detect tag type
      tagData.tagType = event.message?.records ? "NDEF" : "Non-NDEF";

      try {
        const response = await axios.post(`${API_URL}/taps`, tagData);
        console.log("Tag tapped:", response.data);
        setTapHistory((prev) => [response.data, ...prev]);
      } catch (err) {
        console.error("Error saving tap:", err);
        setError("Failed to save tap data");
      }
    };

    nfcReader.onreadingerror = (event) => {
      console.error("NFC read error:", event.message);
      setError(`NFC error: ${event.message}`);
    };

    // Cleanup function
    return () => {
      // Any cleanup if needed
    };
  }, [nfcReader]);

  const startNFCScan = async () => {
    if (!("NDEFReader" in window)) {
      setError("Web NFC is not supported on this device/browser");
      return;
    }

    try {
      const nfc = new NDEFReader();
      await nfc.scan(); // This must be called in response to a user gesture
      setNfcReader(nfc);
      setIsScanning(true);
      setError(""); // Clear any previous errors
    } catch (err) {
      console.error("Error initializing NFC:", err);
      setError(`Failed to start NFC: ${err.message}`);
      setIsScanning(false);
    }
  };

  return (
    <div
      className="App"
      style={{ padding: "20px", maxWidth: "600px", margin: "0 auto" }}
    >
      <h1>NFC Tap Logger</h1>

      {error && <div style={{ color: "red", margin: "10px 0" }}>{error}</div>}

      <div style={{ margin: "20px 0" }}>
        <button
          onClick={startNFCScan}
          disabled={isScanning}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: isScanning ? "#ccc" : "#4CAF50",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: isScanning ? "not-allowed" : "pointer",
          }}
        >
          {isScanning ? "Scanning for NFC Tags..." : "Start NFC Scan"}
        </button>
        <p>Make sure NFC is enabled on your device</p>
      </div>

      <div>
        <h3>Tap History</h3>
        {tapHistory.length === 0 ? (
          <p>No taps recorded yet</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0 }}>
            {tapHistory.map((tap, index) => (
              <li
                key={index}
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  margin: "5px 0",
                  borderRadius: "4px",
                }}
              >
                <div>
                  <strong>Time:</strong>{" "}
                  {new Date(tap.timestamp).toLocaleString()}
                </div>
                <div>
                  <strong>Tag ID:</strong> {tap.serialNumber}
                </div>
                {tap.tagType && (
                  <div>
                    <strong>Type:</strong> {tap.tagType}
                    {tap.tagType === "NDEF" && tap.recordCount > 0 && (
                      <span> ({tap.recordCount} records)</span>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default App;
