import React, { useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import Layout from '../components/layout/Layout';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useAuth } from '../contexts/AuthContext';

const SettingsPage: React.FC = () => {
  const { currentAdmin } = useAuth();
  const [formData, setFormData] = useState({
    pin: '',
    workingHours: {
      start: '09:00',
      end: '17:00',
    },
    notificationPreferences: {
      email: true,
      inApp: true,
      sms: false,
    },
    communicationSettings: {
      emailSignature: '',
      autoReply: false,
      autoReplyMessage: '',
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle settings update
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your account and application preferences
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6">
          {/* Security Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <Input
                  label="Current PIN"
                  type="password"
                  inputMode="numeric"
                  maxLength={7}
                  required
                />
                <Input
                  label="New PIN"
                  type="password"
                  inputMode="numeric"
                  maxLength={7}
                  required
                />
                <Input
                  label="Confirm New PIN"
                  type="password"
                  inputMode="numeric"
                  maxLength={7}
                  required
                />
                <Button type="submit">Update PIN</Button>
              </form>
            </CardContent>
          </Card>

          {/* Working Hours */}
          <Card>
            <CardHeader>
              <CardTitle>Working Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Start Time"
                    type="time"
                    value={formData.workingHours.start}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        workingHours: {
                          ...formData.workingHours,
                          start: e.target.value,
                        },
                      })
                    }
                  />
                  <Input
                    label="End Time"
                    type="time"
                    value={formData.workingHours.end}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        workingHours: {
                          ...formData.workingHours,
                          end: e.target.value,
                        },
                      })
                    }
                  />
                </div>
                <Button type="submit">Save Working Hours</Button>
              </form>
            </CardContent>
          </Card>

          {/* Notification Preferences */}
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.notificationPreferences.email}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          notificationPreferences: {
                            ...formData.notificationPreferences,
                            email: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Email Notifications</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.notificationPreferences.inApp}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          notificationPreferences: {
                            ...formData.notificationPreferences,
                            inApp: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>In-App Notifications</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.notificationPreferences.sms}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          notificationPreferences: {
                            ...formData.notificationPreferences,
                            sms: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>SMS Notifications</span>
                  </label>
                </div>
                <Button type="submit">Save Preferences</Button>
              </form>
            </CardContent>
          </Card>

          {/* Communication Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Communication Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="space-y-4">
                  <Input
                    label="Email Signature"
                    type="text"
                    value={formData.communicationSettings.emailSignature}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        communicationSettings: {
                          ...formData.communicationSettings,
                          emailSignature: e.target.value,
                        },
                      })
                    }
                  />
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.communicationSettings.autoReply}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          communicationSettings: {
                            ...formData.communicationSettings,
                            autoReply: e.target.checked,
                          },
                        })
                      }
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Enable Auto-Reply</span>
                  </label>
                  {formData.communicationSettings.autoReply && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Auto-Reply Message
                      </label>
                      <textarea
                        value={formData.communicationSettings.autoReplyMessage}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            communicationSettings: {
                              ...formData.communicationSettings,
                              autoReplyMessage: e.target.value,
                            },
                          })
                        }
                        rows={4}
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  )}
                </div>
                <Button type="submit">Save Communication Settings</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;