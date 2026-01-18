import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Agent Analytics",
  version: packageJson.version,
  copyright: `© ${currentYear}, Agent Analytics.`,
  meta: {
    title: "Agent Analytics - Cloud Agent Dashboard",
    description:
      "Agent Analytics provides comprehensive monitoring and insights for your AI agents, including session tracking, user analytics, and cost management.",
  },
};
