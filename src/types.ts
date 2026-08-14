export interface ResearchSource {
  name: string;
  url: string;
  category: string; // e.g. "Official Website", "LinkedIn", "Crunchbase", "Bloomberg", "Reuters", "Press Release", "News"
}

export interface LeadershipMember {
  name: string;
  role: string;
}

export interface NewsItem {
  title: string;
  source: string;
  url: string;
  date: string;
}

export interface StrategicInitiative {
  title: string;
  description: string;
}

export interface SalesforceData {
  status: string;
  owner: string;
  opportunityValue: string;
  lastContact: string;
  accountId: string;
  notes?: string;
}

export interface ResearchReport {
  companyName: string;
  website: string;
  industry: string;
  hq: string;
  employees: string;
  revenue: string;
  competitors: string[];
  techStack: string[];
  leadership: LeadershipMember[];
  recentNews: NewsItem[];
  strategicInitiatives: StrategicInitiative[];
  
  // Rich details
  overview: string;
  businessModel: string;
  technologyDetail: string;
  financialsDetail: string;
  leadershipDetail: string;
  competitionDetail: string;
  strategicInitiativesDetail: string;
  salesforceDetail?: string;
  
  sources: ResearchSource[];
  salesforce?: SalesforceData;
}

export interface ResearchHistoryItem {
  id: string;
  companyName: string;
  website: string;
  email: string;
  date: string;
  status: 'Completed' | 'Processing' | 'Failed';
  report?: ResearchReport;
  rawHtml?: string;       // Original HTML from n8n HTML2 node, for direct download
  processingTime?: number; // In seconds
  error?: string;
  statusMessage?: string;
  
  // Sales metadata fields (optional)
  meetingDate?: string;      // ISO date of the scheduled sales meeting
  fitScore?: number;         // 0-100 ICP fit score
  notes?: string;            // free-text rep notes
  lastRefreshed?: string;    // ISO date the report data was last regenerated
}

export interface DashboardStats {
  totalReports: number;
  researchToday: number;
  avgProcessingTime: number; // in seconds
  reportsSent: number;
  topIndustries: { name: string; count: number }[];
  recentResearch: ResearchHistoryItem[];
  volumeHistory?: { day: string; count: number }[];

  // Sales-specific dashboard stats
  meetingsThisWeek: number;
  reportsNeedingRefresh: number;   // reports with lastRefreshed older than 7 days
  highFitLeads: number;            // count where fitScore >= 70
  followUpsDue: number;
}

export interface N8nIntegrationSettings {
  mode: 'disabled' | 'researcher-sync' | 'researcher-async' | 'automation';
  webhookUrl: string;
  authToken: string;
}

export interface SystemSettings {
  theme: 'Light' | 'Enterprise Light' | 'Slate Blue';
  apiKeyMode: 'System Key' | 'Custom User Key';
  customApiKey: string;
  emailSettings: {
    sendAutomatically: boolean;
    ccAddress: string;
    signature: string;
  };
  notificationPreferences: {
    researchStarted: boolean;
    sourcesFound: boolean;
    agentsCompleted: boolean;
    emailSent: boolean;
    reportGenerated: boolean;
  };
  researchPreferences: {
    deepResearchLevel: 'Standard' | 'Deep' | 'Exhaustive';
    focusAreas: string[];
    maxSources: number;
  };
  n8nIntegration: N8nIntegrationSettings;
}

