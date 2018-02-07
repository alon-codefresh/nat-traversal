#!/usr/bin/env node
const http = require('http');
const { addTimestampToConsole } = require('./utils');

const { argv } = require('optimist')
  .usage('Usage: $0 ' +
         '--publicHost [host] --publicPort [port] --relayHost [host] --relayPort [port] [--healthCheckPort [port]]' +
         '[--publicTimeout [ms]] [--publicTls] [--publicCertCN [host]] ' +
         '[--publicPfx [file]] [--publicKey [file]] [--publicCert [file]] [--publicPassphrase [passphrase]] ' +
         '[--relayTimeout [ms]] [--relayTls] [--relayCertCN [host]] ' +
         '[--relayPfx [file]] [--relayKey [file]] [--relayCert [file]] [--relayPassphrase [passphrase]] ' +
         '[--relaySecret [key]] ' +
         '[--silent]')
  .demand(['publicPort', 'relayPort'])

  .default('publicHost', '0.0.0.0')
  .default('publicTimeout', 120000)
  .default('publicTls', false)
  .string('publicCertCN')
  .string('publicPfx')
  .string('publicKey')
  .string('publicCert')
  .string('publicPassphrase')

  .default('relayHost', '0.0.0.0')
  .default('relayTimeout', 120000)
  .default('relayTls', true)
  .string('relayCertCN')
  .string('relayPfx')
  .string('relayKey')
  .string('relayCert')
  .string('relayPassphrase')
  .default('healthCheckPort', null)

  .default('relaySecret', null)
  .default('silent', false);

addTimestampToConsole();

const options = {
  publicTimeout: argv.publicTimeout,
  publicTls: argv.publicTls,
  publicPfx: argv.publicPfx,
  publicPassphrase: argv.publicPassphrase,
  publicKey: argv.publicKey,
  publicCert: argv.publicCert,
  publicCertCN: argv.publicCertCN,
  relayTimeout: argv.relayTimeout,
  relayTls: argv.relayTls,
  relayPfx: argv.relayPfx,
  relayPassphrase: argv.relayPassphrase,
  relayKey: argv.relayKey,
  relayCert: argv.relayCert,
  relayCertCN: argv.relayCertCN,
  relaySecret: argv.relaySecret,
  silent: argv.silent,
};

if (!options.silent) {
  console.log('Starting NAT traversal server.');

  let publicConnectionType;
  if (options.publicTls) {
    publicConnectionType = 'TLS';
  } else {
    publicConnectionType = 'TCP';
  }

  let relayConnectionType;
  if (options.relayTls) {
    relayConnectionType = 'TLS';
  } else {
    relayConnectionType = 'TCP';
  }

  console.log(`Public endpoint is ${argv.publicHost}:${argv.publicPort}, connection will be ${publicConnectionType}.`);
  console.log(`Relay endpoint is ${argv.relayHost}:${argv.relayPort}, connection will be ${relayConnectionType}.`);
  console.log(`Relay connection ${options.relaySecret ? 'WILL' : 'WILL NOT'} use secret.`);
}

const { NATTraversalServer } = require('./index.js');

const natTraversalServer = new NATTraversalServer(
  argv.publicHost,
  argv.publicPort,
  argv.relayHost,
  argv.relayPort,
  options,
);
natTraversalServer.start();

const healthCheckPort = parseInt(argv.healthCheckPort, 10);
if (healthCheckPort) {

  const requestHandler = (request, response) => {
    // console.log('[health] health check')
    response.end('OK');
  };
  const server = http.createServer(requestHandler);
  server.listen(
    healthCheckPort,
    (err) => {
      if (err) {
        console.log('[health] An error occured during the health check: ', err);
      } else {
        console.log(`[health] Health check server is listening on port ${healthCheckPort}`);
      }
    },
  );
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception: ', err);
});

process.on('SIGINT', () => {
  if (!options.silent) {
    console.log('Terminating.');
  }
  natTraversalServer.terminate();
});
