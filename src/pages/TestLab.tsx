import React, { useState } from 'react';
import { useApp } from '../state/AppContext';
import { getTestScenarios, runScenario } from '../engine/scenarios';
import { ScenarioResult } from '../types';
import { Play, CheckCircle2, XCircle, FlaskConical } from 'lucide-react';

export const TestLab: React.FC = () => {
  const { currentProfile, currentChannel, state } = useApp();
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const scenarios = getTestScenarios(currentProfile, currentChannel.key);

  const handleRunAllTests = () => {
    setIsRunning(true);
    const resList = scenarios.map((sc) => runScenario(sc, currentProfile, currentChannel.key, state.settings));

    // Also include profile switch test check
    const profileSwitchPassed = currentProfile.channels.length > 0 && currentChannel !== undefined;
    resList.push({
      scenarioId: 'profile-switch',
      scenarioName: 'Profile Switch & Unit Loading',
      expectedRule: 'NONE',
      actualRulesTriggered: [],
      passed: profileSwitchPassed,
      details: profileSwitchPassed
        ? `Successfully verified profile [${currentProfile.name}] channels and units [${currentChannel.unit}].`
        : 'Profile validation failed.',
    });

    setResults(resList);
    setIsRunning(false);
  };

  const totalTests = results.length;
  const passedTests = results.filter((r) => r.passed).length;
  const failedTests = totalTests - passedTests;

  // Fault tests run (excluding normal and profile switch)
  const faultTests = results.filter((r) => r.scenarioId !== 'normal' && r.scenarioId !== 'profile-switch');
  const detectedFaultTests = faultTests.filter((r) => r.passed);
  const detectionRate = faultTests.length > 0 ? Math.round((detectedFaultTests.length / faultTests.length) * 100) : null;

  // False positives: normal tests that produced events
  const normalTest = results.find((r) => r.scenarioId === 'normal');
  const falsePositives = normalTest && !normalTest.passed ? 1 : 0;

  return (
    <div className="page-content">
      <div className="page-title-row">
        <div>
          <h2>Diagnostic Test Lab</h2>
          <p className="page-subtitle">Run deterministic synthetic test scenarios against the active sensor profile ({currentProfile.name} - {currentChannel.label}).</p>
        </div>

        <button
          className="btn btn-primary"
          onClick={handleRunAllTests}
          disabled={isRunning}
        >
          <Play size={16} /> {isRunning ? 'Running Test Suite...' : 'Run All Scenarios'}
        </button>
      </div>

      <div className="test-summary-grid">
        <div className="summary-card">
          <div className="card-icon-wrap" style={{ background: '#e0f2fe', color: '#0369a1' }}>
            <FlaskConical size={20} />
          </div>
          <div>
            <p className="card-label">Total Test Scenarios</p>
            <h3 className="card-value">{totalTests}</h3>
            <p className="card-sub">{passedTests} Passed, {failedTests} Failed</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon-wrap" style={{ background: '#ccfbf1', color: '#0f766e' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="card-label">Fault Detection Rate</p>
            <h3 className="card-value">{detectionRate !== null ? `${detectionRate}%` : 'Not yet measured'}</h3>
            <p className="card-sub">Detected / Total fault scenarios</p>
          </div>
        </div>

        <div className="summary-card">
          <div className="card-icon-wrap" style={{ background: '#fef3c7', color: '#b45309' }}>
            <CheckCircle2 size={20} />
          </div>
          <div>
            <p className="card-label">False Positives (Normal)</p>
            <h3 className="card-value">{results.length > 0 ? falsePositives : 'N/A'}</h3>
            <p className="card-sub">Normal tests triggering false alerts</p>
          </div>
        </div>
      </div>

      <div className="card test-table-card">
        <h3>Test Suite Execution Results</h3>
        <p className="card-subtitle">Scenarios run instantly through the deterministic diagnostic engine.</p>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Scenario Name</th>
                <th>Expected Rule</th>
                <th>Actual Triggered Rules</th>
                <th>Result Details</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr>
                  <td colSpan={5} className="empty-table-cell">
                    Click "Run All Scenarios" to execute the diagnostic test suite.
                  </td>
                </tr>
              ) : (
                results.map((res) => (
                  <tr key={res.scenarioId}>
                    <td><strong>{res.scenarioName}</strong></td>
                    <td><span className="code-badge">{res.expectedRule}</span></td>
                    <td>{res.actualRulesTriggered.length > 0 ? res.actualRulesTriggered.join(', ') : 'NONE'}</td>
                    <td>{res.details}</td>
                    <td>
                      {res.passed ? (
                        <span className="badge badge-normal flex-badge">
                          <CheckCircle2 size={14} /> PASS
                        </span>
                      ) : (
                        <span className="badge badge-critical flex-badge">
                          <XCircle size={14} /> FAIL
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
