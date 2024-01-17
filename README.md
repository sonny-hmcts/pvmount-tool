# pvmount CLI tool for MAC OS

pvmount (proprerty volume mount) is a tool created to download azure secrets and mount
them to the following path /mnt/secrets

The tool is designed to complement https://github.com/hmcts/properties-volume-nodejs

## Getting Started from source

### prerequisites

- [Node.js](https://nodejs.org/) version can be found in [.nvmrc](https://github.com/hmcts/cui-ra/blob/master/.nvmrc) (as of writting v18.17.1)
- [NVM](https://github.com/nvm-sh/nvm#installing-and-updating) node version manager (optional but allows swapping node version with a single command)
- [Azure CLI](https://learn.microsoft.com/en-gb/cli/azure/install-azure-cli)

If using [NVM](https://github.com/nvm-sh/nvm#installing-and-updating) the following command can be run in the project root directory to make sure the enviroment has the same nodejs version stated in the .nvmrc file. This command can be skipped if your version of node already matches the required version found in the .nvmrc file.

```bash
nvm use
```

As the application mounts files in the root folder sudo is required

### Running the application from source code

Install dependencies by executing the following command:

```bash
npm install
```

#### Run the help command to get a list of commands

```bash
sudo node pvmount.js -h
```

#### Run the command to download secrets and mount files

```bash
sudo node pvmount.js -n aac  -e aat
```

#### Run the command to download secrets to a specific folder

```bash
sudo node pvmount.js -n aac  -e aat -m /some/dir/example
```

### Build cli to executable

```bash
npm run build
```

This will output an executable file called pvmount with no extension

### Install pvmount

Copy the new pvmount executable created into the following folder

```bash
/user/local/bin
```

Open a new terminal and run the following to check installation

```bash
pvmount -h
```


### Mac OS catalina and up
This cli tool will work with pre and post catalina. However since Catalina OS. Apple has made the root directory read-only. To bypass this issue the tool will create a file called.

```bash
/etc/synthetic.conf
```

That will contain confirugration to create a readonly symlink from /mnt/secrets -> /Volumes/mnt/secrets

```bash
/mnt/secrets -> /Volumes/mnt/secrets
```

Synthetic.conf is read on boot however the tool will run a command to force
the configurations to take place without a reboot and then for safty the tool will delete the newly created /etc/synthetic.conf file.

#### Why Delete synthetic.conf

Although the tool should create the perfect file any sort of issue inside synthetic.conf will prevent Mac OS from booting. it is saver for pvmount to delete the file after it is done forcing a mount. The downside to this is that the pvmount commands has to be run again if a reboot has taken place. going forward a command could be added to turn off auto deletetion of the synthetic.conf file if your feeling lucky it wont break the boot. 