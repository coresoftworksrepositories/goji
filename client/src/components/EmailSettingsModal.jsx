import React, { useState, useEffect } from 'react';
import '../styles/email-settings.css';

const EmailSettingsModal = ({ teamId, isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    smtpHost: '',
    smtpPort: 587,
    smtpUser: '',
    smtpPassword: '',
    fromEmail: '',
    fromName: '',
    enableTicketReminders: true,
    enableStoryReminders: true,
    reminderFrequencyDays: 1,
    ticketReminderDaysBefore: 1,
    storyReminderDaysBefore: 1,
    reminderTime: '09:00'
  });

  const [currentSettings, setCurrentSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [showPassword, setShowPassword] = useState(false);

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  // Fetch current email settings
  useEffect(() => {
    if (isOpen && teamId) {
      fetchEmailSettings();
    }
  }, [isOpen, teamId]);

  const fetchEmailSettings = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${apiUrl}/email-settings/${teamId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentSettings(data);
        // Populate form with existing settings (without password)
        setFormData(prev => ({
          ...prev,
          smtpHost: data.smtpHost || '',
          smtpPort: data.smtpPort || 587,
          smtpUser: data.smtpUser || '',
          fromEmail: data.fromEmail || '',
          fromName: data.fromName || '',
          enableTicketReminders: data.enableTicketReminders !== false,
          enableStoryReminders: data.enableStoryReminders !== false,
          reminderFrequencyDays: data.reminderFrequencyDays || 1,
          ticketReminderDaysBefore: data.ticketReminderDaysBefore || 1,
          storyReminderDaysBefore: data.storyReminderDaysBefore || 1,
          reminderTime: data.reminderTime || '09:00'
        }));
      } else if (response.status === 404) {
        // No settings found yet, will create new ones
        setCurrentSettings(null);
      } else {
        setMessage({ type: 'error', text: 'Failed to fetch email settings' });
      }
    } catch (error) {
      console.error('Error fetching email settings:', error);
      setMessage({ type: 'error', text: 'Error fetching email settings' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'smtpPort' ? parseInt(value) : value)
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.smtpHost || !formData.smtpUser || !formData.fromEmail) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' });
      return;
    }

    if (!formData.smtpPassword && !currentSettings) {
      setMessage({ type: 'error', text: 'SMTP password is required for new configurations' });
      return;
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('authToken');

      const payload = {
        ...formData,
        // Only include password if it was changed
        ...(formData.smtpPassword && { smtpPassword: formData.smtpPassword })
      };

      const response = await fetch(`${apiUrl}/email-settings/${teamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        setMessage({ type: 'success', text: 'Email settings saved successfully!' });
        setCurrentSettings(data.settings);
        setFormData(prev => ({ ...prev, smtpPassword: '' })); // Clear password from form
        if (onSuccess) onSuccess();
        
        // Auto-close after 2 seconds
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to save email settings' });
      }
    } catch (error) {
      console.error('Error saving email settings:', error);
      setMessage({ type: 'error', text: 'Error saving email settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async (e) => {
    e.preventDefault();

    if (!testEmail) {
      setMessage({ type: 'error', text: 'Please enter a test email address' });
      return;
    }

    try {
      setTesting(true);
      const token = localStorage.getItem('authToken');

      const response = await fetch(`${apiUrl}/email-settings/${teamId}/test`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ testEmail })
      });

      if (response.ok) {
        setMessage({ type: 'success', text: 'Test email sent successfully! Check your inbox.' });
        setTestEmail('');
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.error || 'Failed to send test email' });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      setMessage({ type: 'error', text: 'Error sending test email' });
    } finally {
      setTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="email-settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Email Settings</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {loading ? (
          <div className="loading">Loading email settings...</div>
        ) : (
          <div className="modal-content">
            {message.text && (
              <div className={`message message-${message.type}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSave}>
              <fieldset>
                <legend>SMTP Configuration</legend>
                
                <div className="form-group">
                  <label htmlFor="smtpHost">SMTP Host *</label>
                  <input
                    type="text"
                    id="smtpHost"
                    name="smtpHost"
                    value={formData.smtpHost}
                    onChange={handleInputChange}
                    placeholder="e.g., smtp.gmail.com"
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="smtpPort">SMTP Port *</label>
                    <input
                      type="number"
                      id="smtpPort"
                      name="smtpPort"
                      value={formData.smtpPort}
                      onChange={handleInputChange}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="smtpUser">SMTP Username *</label>
                    <input
                      type="text"
                      id="smtpUser"
                      name="smtpUser"
                      value={formData.smtpUser}
                      onChange={handleInputChange}
                      placeholder="e.g., your-email@gmail.com"
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="smtpPassword">
                    SMTP Password {currentSettings ? '(leave blank to keep current)' : '*'}
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="smtpPassword"
                      name="smtpPassword"
                      value={formData.smtpPassword}
                      onChange={handleInputChange}
                      placeholder="Enter password"
                      required={!currentSettings}
                    />
                    <button
                      type="button"
                      className="toggle-password"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? '👁️‍🗨️' : '👁️'}
                    </button>
                  </div>
                </div>
              </fieldset>

              <fieldset>
                <legend>Sender Configuration</legend>

                <div className="form-group">
                  <label htmlFor="fromEmail">From Email Address *</label>
                  <input
                    type="email"
                    id="fromEmail"
                    name="fromEmail"
                    value={formData.fromEmail}
                    onChange={handleInputChange}
                    placeholder="e.g., notifications@company.com"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="fromName">From Name (Display Name)</label>
                  <input
                    type="text"
                    id="fromName"
                    name="fromName"
                    value={formData.fromName}
                    onChange={handleInputChange}
                    placeholder="e.g., Goji Notifications"
                  />
                </div>
              </fieldset>

              <fieldset>
                <legend>Reminder Settings</legend>

                <div className="form-group checkbox">
                  <input
                    type="checkbox"
                    id="enableTicketReminders"
                    name="enableTicketReminders"
                    checked={formData.enableTicketReminders}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="enableTicketReminders">Enable Ticket Reminders</label>
                </div>

                <div className="form-group checkbox">
                  <input
                    type="checkbox"
                    id="enableStoryReminders"
                    name="enableStoryReminders"
                    checked={formData.enableStoryReminders}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="enableStoryReminders">Enable Story Reminders</label>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="ticketReminderDaysBefore">Days Before Due Date (Tickets)</label>
                    <input
                      type="number"
                      id="ticketReminderDaysBefore"
                      name="ticketReminderDaysBefore"
                      min="0"
                      max="30"
                      value={formData.ticketReminderDaysBefore}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="storyReminderDaysBefore">Days Before Due Date (Stories)</label>
                    <input
                      type="number"
                      id="storyReminderDaysBefore"
                      name="storyReminderDaysBefore"
                      min="0"
                      max="30"
                      value={formData.storyReminderDaysBefore}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="reminderFrequencyDays">Reminder Frequency (days)</label>
                    <input
                      type="number"
                      id="reminderFrequencyDays"
                      name="reminderFrequencyDays"
                      min="1"
                      max="30"
                      value={formData.reminderFrequencyDays}
                      onChange={handleInputChange}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="reminderTime">Reminder Time (24-hour format)</label>
                    <input
                      type="time"
                      id="reminderTime"
                      name="reminderTime"
                      value={formData.reminderTime}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </fieldset>

              <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Settings'}
                </button>
                <button type="button" className="btn-secondary" onClick={onClose}>
                  Cancel
                </button>
              </div>
            </form>

            {currentSettings && (
              <div className="test-section">
                <h3>Test Email Configuration</h3>
                <p>Send a test email to verify your configuration works correctly.</p>
                <div className="test-form">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="Enter your test email address"
                  />
                  <button
                    onClick={handleTestEmail}
                    disabled={testing}
                    className="btn-secondary"
                  >
                    {testing ? 'Sending...' : 'Send Test Email'}
                  </button>
                </div>
              </div>
            )}

            <div className="info-section">
              <h3>ℹ️ Common SMTP Settings</h3>
              <ul>
                <li><strong>Gmail:</strong> Host: smtp.gmail.com, Port: 587 or 465 (with App Password)</li>
                <li><strong>Microsoft Outlook:</strong> Host: smtp-mail.outlook.com, Port: 587</li>
                <li><strong>SendGrid:</strong> Host: smtp.sendgrid.net, Port: 587</li>
                <li><strong>AWS SES:</strong> Host: email-smtp.[region].amazonaws.com, Port: 587</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailSettingsModal;
