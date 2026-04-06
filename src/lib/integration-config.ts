export const INTEGRATION_REQUIREMENTS = {
  google: {
    name: 'Google Calendar',
    envVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  },
  microsoft: {
    name: 'Microsoft Outlook',
    envVars: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
  },
  zoom: {
    name: 'Zoom',
    envVars: ['ZOOM_CLIENT_ID', 'ZOOM_CLIENT_SECRET'],
  },
  google_meet: {
    name: 'Google Meet',
    envVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
  },
  stripe: {
    name: 'Stripe',
    envVars: ['STRIPE_CLIENT_ID', 'STRIPE_SECRET_KEY'],
  },
  salesforce: {
    name: 'Salesforce',
    envVars: ['SALESFORCE_CLIENT_ID', 'SALESFORCE_CLIENT_SECRET'],
  },
  hubspot: {
    name: 'HubSpot',
    envVars: ['HUBSPOT_CLIENT_ID', 'HUBSPOT_CLIENT_SECRET'],
  },
  slack: {
    name: 'Slack',
    envVars: ['SLACK_CLIENT_ID', 'SLACK_CLIENT_SECRET'],
  },
} as const;

export type IntegrationProvider = keyof typeof INTEGRATION_REQUIREMENTS;

export type IntegrationSetupStatus = {
  provider: IntegrationProvider;
  name: string;
  isConfigured: boolean;
  missingEnvVars: string[];
  helpText: string;
};

export function getIntegrationSetupStatus(provider: IntegrationProvider): IntegrationSetupStatus {
  const config = INTEGRATION_REQUIREMENTS[provider];
  const missingEnvVars = config.envVars.filter((envVar) => !process.env[envVar]?.trim());

  return {
    provider,
    name: config.name,
    isConfigured: missingEnvVars.length === 0,
    missingEnvVars,
    helpText: missingEnvVars.length
      ? `Set ${missingEnvVars.join(', ')} in environment variables.`
      : `${config.name} is ready to connect.`,
  };
}

export function getAllIntegrationSetupStatuses() {
  return Object.keys(INTEGRATION_REQUIREMENTS).map((provider) =>
    getIntegrationSetupStatus(provider as IntegrationProvider)
  );
}
