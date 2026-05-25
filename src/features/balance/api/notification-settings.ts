import { request } from 'shared/lib/request';

export interface NotificationSettingsResponse {
  email_enabled: boolean;
  warning_threshold: number;
  critical_threshold: number;
}

export interface UpdateNotificationSettingsPayload {
  email_enabled: boolean;
  warning_threshold: number;
  critical_threshold: number;
}

export async function getNotificationSettings(): Promise<NotificationSettingsResponse> {
  const response = await request<NotificationSettingsResponse>(
    '/advertisers/notification-settings',
  );

  return response.data;
}

export async function updateNotificationSettings(
  payload: UpdateNotificationSettingsPayload,
): Promise<NotificationSettingsResponse> {
  const response = await request<NotificationSettingsResponse>(
    '/advertisers/notification-settings',
    {
      method: 'PUT',
      body: payload,
    },
  );

  return response.data;
}
