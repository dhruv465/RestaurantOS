// Server-Sent Events: the server only pushes "something changed" so clients refetch. No extra dependency.
// shortcut: clients live in this process's memory; switch to a Redis pub/sub fan-out if we ever run more than one backend instance.
const clients = new Set();

const subscribe = (req, res) => {
    res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });
    res.flushHeaders();
    res.write('retry: 3000\n\n');
    clients.add(res);

    const ping = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => {
        clearInterval(ping);
        clients.delete(res);
    });
};

// type: "order" | "table" | "menu" | "settings" | "alert" (kind: waiter, bill, preparing, ready) ...
const emit = (type, data = {}) => {
    const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
    for (const res of clients) res.write(message);
};

module.exports = { subscribe, emit };
