const { PGlite } = require('@electric-sql/pglite');
const { PGLiteSocketServer } = require('@electric-sql/pglite-socket');

async function run() {
  // Persist to disk. With no path PGlite runs purely in memory, so every restart
  // silently dropped every table and the app came back up with an empty database.
  const db = await PGlite.create({ dataDir: './.pgdata' });
  
  const server = new PGLiteSocketServer({
    db,
    port: 5432,
    host: '127.0.0.1',
    maxConnections: 100,
    inspect: true,
  });

  // Hotpatch the QueryQueueManager prototype to fix the critical transaction/error lockup bug.
  // The original implementation has a "return" inside the catch block which leaves "this.processing = true" forever.
  const QueryQueueManagerProto = server.queryQueue.constructor.prototype;
  QueryQueueManagerProto.processQueue = async function() {
    if (this.processing || this.queue.length === 0) {
      return;
    }
    this.processing = true;
    try {
      while (this.queue.length > 0) {
        let query;
        if (this.db.isInTransaction() && this.lastHandlerId) {
          const i = this.queue.findIndex(q => q.handlerId === this.lastHandlerId);
          if (i === -1) {
            this.log(`transaction started, but no query from the same handler id found in queue`, this.lastHandlerId);
            query = null;
          } else {
            query = this.queue.splice(i, 1)[0];
          }
        } else {
          query = this.queue.shift();
        }
        if (!query) break;

        const waitTime = Date.now() - query.timestamp;
        this.log(`processing query from handler #${query.handlerId} (waited ${waitTime}ms)`);

        let result = 0;
        try {
          await this.db.runExclusive(async () => {
            return await this.db.execProtocolRawStream(query.message, {
              onRawData: (data) => {
                result += data.length;
                query.onData(data);
              },
            });
          });
        } catch (error) {
          this.log(`query from handler #${query.handlerId} failed:`, error);
          query.reject(error);
          continue; // Continue processing the rest of the queue
        }

        this.log(`query from handler #${query.handlerId} completed, ${result} bytes`);
        this.lastHandlerId = query.handlerId;
        query.resolve(result);
      }
    } finally {
      this.processing = false;
      this.log(`queue processing complete, queue length is`, this.queue.length);
    }
  };

  await server.start();
  console.log('Postgres mock server running on 127.0.0.1:5432 with maxConnections=100 and QueryQueueManager hotfix');
}

run().catch(console.error);
