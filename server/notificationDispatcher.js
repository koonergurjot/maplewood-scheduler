export function createWebhookDispatcher(options = {}) {
  const {
    emailUrl = process.env.DEADLINE_EMAIL_WEBHOOK,
    smsUrl = process.env.DEADLINE_SMS_WEBHOOK,
    fetchImpl = globalThis.fetch?.bind(globalThis),
  } = options;

  const send = async (url, event, channel) => {
    if (!url || typeof fetchImpl !== "function") return;
    try {
      await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...event, channel }),
      });
    } catch (err) {
      console.warn(`Failed to dispatch ${channel} webhook`, err);
    }
  };

  return {
    async dispatch(event) {
      const tasks = [];
      if (event.channels?.includes("email")) {
        tasks.push(send(emailUrl, event, "email"));
      }
      if (event.channels?.includes("sms")) {
        tasks.push(send(smsUrl, event, "sms"));
      }
      if (tasks.length) {
        await Promise.allSettled(tasks);
      }
    },
    async sendEmail(event) {
      await send(emailUrl, event, "email");
    },
    async sendSms(event) {
      await send(smsUrl, event, "sms");
    },
  };
}

export default createWebhookDispatcher;
