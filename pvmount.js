#!/usr/bin/env node

const program = require('commander');
const os = require('os');
const path = require('path');
const { AzureCliCredential } = require('@azure/identity');
const { SecretClient } = require('@azure/keyvault-secrets');

const { exec } = require('child_process');
const fs = require('fs');

program
  .version('1.0.0')
  .description('A CLI tool for pvmount')
  .option('-n, --namespace <namespace>', 'Specify the namespace')
  .option('-e, --environment <environment>', 'Specify the environment name')
  .option('-m, --mount <mountlocation>', 'Specify the mount location (optional)')
  .parse(process.argv);

// Get the macOS version
const macOsVersion = os.release();

// Extract the major version
const majorVersion = parseInt(macOsVersion.split('.')[0], 10);

// Compare with Catalina's major version (10)
const isCatalinaOrLater = majorVersion >= 19;

let syntheticPath = '/etc/synthetic.conf';
let fileContents = 'mnt /Volumes/mnt';

let PreCatalinaMount = 'mnt';
let CatalinaMount = 'Volumes/mnt';

// Set the default mount location
let mount = program.mount ?? (isCatalinaOrLater ? `/${CatalinaMount}/secrets` : `/${PreCatalinaMount}/secrets`);

const { namespace, environment } = program.opts();

if (!namespace || !environment) {
  console.error('Error: Both namespace and environment are required.');
  program.help();
}

console.log(`Mounting with Namespace: ${namespace}, Environment: ${environment} to folder location ${mount}`);

async function mountSecrets(vaultName, nameSpace, outputDir = null) {
  if (!outputDir) {
    throw new Error('mount point is required');
  }

  try {
    // Create an Azure CLI credential
    const credential = new AzureCliCredential();

    // Create a SecretClient
    const vaultUrl = `https://${vaultName}.vault.azure.net/`;
    const client = new SecretClient(vaultUrl, credential);

    // Get all secrets from the Key Vault
    const secrets = client.listPropertiesOfSecrets();

    // Create the output directory if it doesn't exist
    if (outputDir) {
      fs.mkdirSync(path.join(outputDir, nameSpace), { recursive: true });
    }

    // Loop through the secrets and store them in files
    for await (const secretProperties of secrets) {
      const secretName = secretProperties.name;
      const secretValue = await client.getSecret(secretName);

      // Define the output file path
      const filePath = outputDir ? path.join(outputDir, nameSpace, secretName) : secretName;

      // Write the secret value to the file
      fs.writeFileSync(filePath, secretValue.value);

      console.log(`Secret '${secretName}' stored in '${filePath}'`);
    }
  } catch (error) {
    if (error.name === 'CredentialUnavailableError') {
      console.error("Azure CLI credential is not available. Please log in using 'az login'.");
      program.help();
    } else {
      console.error(error);
      program.help();
    }
  }
}

async function createSyntheticLink(folderName, actualPath) {
  const commands = [
    `sudo touch /etc/synthetic.conf`,
    `sudo chmod 0666 /etc/synthetic.conf`,
    `sudo printf "${folderName}\t${actualPath}\n" >> /etc/synthetic.conf`,
    `sudo chmod 0644 /etc/synthetic.conf`,
    `sudo chown root:wheel /etc/synthetic.conf`,
    `/System/Library/Filesystems/apfs.fs/Contents/Resources/apfs.util -t`,
    `sudo rm /etc/synthetic.conf`
  ];
  // Execute each command one by one
  for (const command of commands) {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        // Add a command to remove synthetic.conf in case of failure
        exec('sudo rm /etc/synthetic.conf', (rmError) => {
            console.log('synthetic.conf removed');
        });
        return;
      }
      console.log(`Command executed successfully: ${command}`);
      if (stdout) console.log(`Command output:\n${stdout}`);
      if (stderr) console.error(`Command error:\n${stderr}`);
    });
  }
}

async function run(){
    //download secrect into the mount location
    await mountSecrets(`${namespace}-${environment}`, namespace, mount);
    if(isCatalinaOrLater && mount === `/${CatalinaMount}/secrets`){
      if(!fs.existsSync(syntheticPath)){
          console.log('Due to versions of Catalina OS and upwards only allowing read only /mnt cannot be created. We will now create a synthetic link to /Volumes/mnt');
          await createSyntheticLink(PreCatalinaMount, CatalinaMount);
          return;
      }
    }
}

run();