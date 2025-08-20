import { IntegrationAppClient } from "@membranehq/sdk";
import { Logger } from "@aws-lambda-powertools/logger";
import jwt from "jsonwebtoken";

const logger = new Logger();

const MEMBRANE_WORKSPACE_KEY = process.env.MEMBRANE_WORKSPACE_KEY || "";
const MEMBRANE_WORKSPACE_SECRET = process.env.MEMBRANE_WORKSPACE_SECRET || "";
const MEMBRANE_API_URI = process.env.MEMBRANE_API_URI || "";
const GMAIL_CONNECTION_ID = process.env.GMAIL_CONNECTION_ID || "";
const CUSTOMER_ID = process.env.CUSTOMER_ID || "";
const CUSTOMER_NAME = process.env.CUSTOMER_NAME || "";

// Lazy initialization of Membrane client
let membrane: IntegrationAppClient | null = null;

function generateJWTToken(): string {
  const tokenData = {
    id: CUSTOMER_ID,
    name: CUSTOMER_NAME,
  };

  const options = {
    issuer: MEMBRANE_WORKSPACE_KEY,
    expiresIn: 7200, // 2 hours
    algorithm: "HS512" as const,
  };

  return jwt.sign(tokenData, MEMBRANE_WORKSPACE_SECRET, options);
}

function getMembraneClient(): IntegrationAppClient {
  if (!membrane) {
    const token = generateJWTToken();
    const config: any = {
      token: token,
    };
    
    // Add API URI if specified (for local development)
    if (MEMBRANE_API_URI) {
      config.apiUri = MEMBRANE_API_URI;
    }
    
    logger.info("Initializing Membrane client with JWT authentication");
    membrane = new IntegrationAppClient(config);
  }
  return membrane;
}

export interface EmailData {
  to: string;
  subject: string;
  body: string;
  from?: string;
}

export class MembraneService {
  /**
   * Send email via Gmail integration
   */
  static async sendEmail(connectionId: string, emailData: EmailData): Promise<void> {
    try {     
      const client = getMembraneClient();
      const resp = await client.connection(connectionId).action("send-email").run({
        to: [emailData.to], 
        subject: emailData.subject,
        body: emailData.body
      });
      logger.info("resp", resp);
      logger.info("Email sent successfully via Membrane");
    } catch (error) {
      logger.error("Error sending email via Membrane", error as Error);
      // Don't throw error to prevent webhook processing from failing
      logger.info("Continuing webhook processing despite email failure");
    }
  }

  /**
   * Get Gmail connection for the workspace
   */
  static async getGmailConnection(): Promise<string> {
    try {
      const client = getMembraneClient();
      const connections = await client.connections.find({
        integrationKey: "gmail",
        limit: 1,
      });

      if (connections.items.length === 0) {
        throw new Error("No Gmail connection found. Please set up Gmail integration first.");
      }

      return connections.items[0].id;
    } catch (error) {
      logger.error("Error getting Gmail connection", error as Error);
      throw error;
    }
  }

  /**
   * Helper method to send email with automatic connection lookup
   */
  static async sendEmailWithAutoConnection(emailData: EmailData): Promise<void> {
    let connectionId = GMAIL_CONNECTION_ID;
    
    // Fallback to dynamic lookup if connection ID not configured
    if (!connectionId) {
      connectionId = await this.getGmailConnection();
    }
    
    await this.sendEmail(connectionId, emailData);
  }
}