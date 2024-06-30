import axios, { type AxiosInstance, type AxiosResponse } from "axios";
import type { HostServer } from "./types";
import { config } from "../..";
import type { Server } from "../../tables/server";

export namespace HostAPI {
  const client: AxiosInstance = axios.create({
    baseURL: config.session_url,
    timeout: 5000,
    headers: { Authorization: `Basic ${config.token}` },
  });

  export async function getAllServers(): Promise<HostServer[]> {
    try {
      const response: AxiosResponse<HostServer[]> = await client.get("/list", {
        responseType: "json",
      });

      if (response.status !== 200) throw new Error(`HostAPI Error: ${response.statusText}`);

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) throw new Error(`Network Error: ${error}`);

      throw new Error(`Failed to getAllServers: ${error}`);
    }
  }

  export async function getServerBySessionId(sessionId: string): Promise<HostServer> {
    try {
      const response: AxiosResponse<HostServer> = await client.get(`/list/${sessionId}`, {
        responseType: "json",
      });

      if (response.status !== 200) throw new Error(`HostAPI Error: ${response.statusText}`);

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) throw new Error(`Network Error: ${error}`);

      throw new Error(`Failed to getServerBySessionId: ${error}`);
    }
  }

  export async function createServer(server: Partial<Server>): Promise<HostServer> {
    try {
      const response: AxiosResponse<HostServer> = await client.post(`/create`, server, {
        responseType: "json",
      });

      if (response.status !== 200) throw new Error(`HostAPI Error: ${response.statusText}`);

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) throw new Error(`Network Error: ${error}`);

      throw new Error(`Failed to getServerBySessionId: ${error}`);
    }
  }
}
