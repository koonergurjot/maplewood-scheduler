import { randomUUID } from "crypto";
import { createWebhookDispatcher } from "./notificationDispatcher.js";

export class DeadlineHub {
  constructor({ dispatcher } = {}) {
    this.clients = new Map();
    this.dispatcher = dispatcher ?? createWebhookDispatcher();
    this.keepAliveMs = 25_000;
  }

  setDispatcher(dispatcher) {
    this.dispatcher = dispatcher ?? createWebhookDispatcher();
  }

  addClient(res) {
    const id = randomUUID();
    const keepAlive = setInterval(() => {
      try {
        res.write(":keep-alive\n\n");
      } catch (err) {
        clearInterval(keepAlive);
        this.removeClient(id);
      }
    }, this.keepAliveMs);
    this.clients.set(id, { res, keepAlive });
    return id;
  }

  removeClient(id) {
    const client = this.clients.get(id);
    if (!client) return;
    clearInterval(client.keepAlive);
    try {
      client.res.end();
    } catch {
      // ignore
    }
    this.clients.delete(id);
  }

  async broadcast(event) {
    const payload = {
      id: event.id ?? randomUUID(),
      ...event,
      origin: event.origin ?? "server",
      broadcastedAt: event.broadcastedAt ?? new Date().toISOString(),
    };
    const serialized = `event: deadline\ndata: ${JSON.stringify(payload)}\n\n`;
    for (const [id, { res }] of this.clients.entries()) {
      try {
        res.write(serialized);
      } catch (err) {
        console.warn("Failed to push deadline event to client", err);
        this.removeClient(id);
      }
    }
    await this.dispatch(payload);
    return payload;
  }

  async dispatch(event) {
    if (!this.dispatcher) return;
    if (typeof this.dispatcher.dispatch === "function") {
      await this.dispatcher.dispatch(event);
      return;
    }
    const tasks = [];
    if (event.channels?.includes("email") && typeof this.dispatcher.sendEmail === "function") {
      tasks.push(this.dispatcher.sendEmail(event));
    }
    if (event.channels?.includes("sms") && typeof this.dispatcher.sendSms === "function") {
      tasks.push(this.dispatcher.sendSms(event));
    }
    if (tasks.length) {
      await Promise.allSettled(tasks);
    }
  }
}

export const deadlineHub = new DeadlineHub();

export default deadlineHub;
