import { request } from 'shared/lib/request';

export interface NotificationSettingsResponse {
  email_enabled: boolean;
  warning_threshold: number;
  critical_threshold: number;
}

export async function getNotificationSettings(): Promise<NotificationSettingsResponse> {
  const res = await request<NotificationSettingsResponse>('/advertisers/notification-settings');
  return res.data;
}

export async function updateNotificationSettings(
  settings: Partial<NotificationSettingsResponse>,
): Promise<NotificationSettingsResponse> {
  const res = await request<NotificationSettingsResponse>('/advertisers/notification-settings', {
    method: 'PUT',
    body: settings,
  });
  return res.data;
}
