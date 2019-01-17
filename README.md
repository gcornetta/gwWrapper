[![Build Status](https://travis-ci.com/gcornetta/gwWrapper.svg?branch=master)](https://travis-ci.com/gcornetta/gwWrapper)
[![Known Vulnerabilities](https://snyk.io/test/github/gcornetta/gwWrapper/badge.svg)](https://snyk.io/test/github/gcornetta/gwWrapper)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

![NEWTON BANNER](/docs/images/banner.png)

# Fab Lab Modules: Fab Lab APIs Wrapper (Pi-Gateway)
<p align="justify">
This software is part of a larger suite of microservices designed to remotely manage digital fabrication equipment in a loosely coupled and distributed environment. More specifically, the software in this implements a wrapper for the Fab Lab APIs with basic security policies. Fab Lab machines are not directly exposed to the internet, but rather they are protected by a Gateway which is the entry point to Fab Lab fabrication resources. The Gateway is responsible for managing Fab Lab access, routing incoming fabrication requests to available machines and interacting with the Cloud Hub to control fabrication status. The Fab Lab APIs wrapper has be designed to work either as a standalone application or behind a more feature-rich and general-purpose gateway as, for example, <a href="https://www.express-gateway.io/">Express Gateway</a>. All the Gateway software infrastructure can be orchestrated by a CLI that at the moment has not been open-sourced; however, the CLI is not necessary to control the Fab Lab APIs wrapper.
</p>

# About
<p align="justify">
  This software has been developed by <em>Gianluca Cornetta</em> and <em>Javier Mateos</em> within <b>NEWTON</b> project. <b>NEWTON</b> is a large scale Integrated Action, started in March 2016 and scheduled to end in summer 2019, funded by the European Commission under the Horizon 2020 Researh and Innovation Programme with grant agreement n. 688503.
</p>

# Table of contents

1. [Preliminary steps](#preliminary-steps)
   * [Hardware prerequisites](#hardware-prerequisites)
   * [Software prerequisites](#software-prerequisites)
   * [Installation](#installation)
2. [Software descriotion](#software-description)
   * [Running npm behind a proxy](#npm-proxy)
3. [Documentation and developer support](#documentation-and-developer-support)
   * [Machine APIs](#machine-apis)
     + [Versioning](#versioning)
     + [Supported formats](#supported-formats)
     + [Error management](#error-management)
     + [On-line documentation](#on-line-documentation)
     + [APIs responses](#api-responses)
4. [Websites](#websites)
5. [Contribution guidelines](#contribution-guidelines)
6. [License](#license)

<a name="preliminary-steps"></a>
# Preliminary steps
<p align="justify">
Before installing the software you have to make sure that you comply with the hardware and software requirements specified in the next two sections.
</p>

<a name="hardware-prerequisites"></a>
## Hardware prerequisites
<p align="justify">
This software has been tested on a Raspberry Pi III Model B (amrv7 32-bit architecture) with a 8-GByte SD card. You need at least 150 MBytes of free disk space to install the software.
</p>

<a name="software-prerequisites"></a>
## Software prerequisites
<p align="justify">
The Machine wrapper software requires that you previously install on your system the following software packages:
</p>

1. Redis v4.x
2. Express Gateway v1.x (optional)

<p align="justify">
We have not tested the software with Redis latest version; however it should work without any problem if you update <b>redis</b> client to the last version in the `package.json` file with the project dependencies.
</p>

<a name="installation"></a>
## Installation
To install the Machine Wrapper module go through the following steps:

1. download or clone this repo,
2. run `npm install` in the installation folder,
3. run `npm run start` to start the service.

<p align="justify">
  The server listen to <b>port 3000</b> of your Raspberry Pi. 
</p>

If you plan to use the Fab Lab APIs Wrapper software behind Express Gateway you should configure Express Gateway to redirect all the incoming requests to `localhost:3000`. Please, refer to this [link](https://www.express-gateway.io/docs/configuration/gateway.config.yml/) in order to suitably configure Express Gateway.

<a name="software-description"></a>
# Software description
<p align="justify">
The Fab Lab APIs Wrapper (i.e. the Pi-Gateway) has been designed as an independent microservice that acts at the Fab Lab Gateway backend. The software implements features to communicate and control the Fabrication Machine Wrappers (i.e. the Pi-Wrappers). The Pi-Gateway relies on Redis to keep the status of the Fab Lab (running fabrication batches, machine status, user quotas, etc.)  
</p>

<a name="npm-proxy"></a>
## Running npm behind a proxy
<p align="justify">
All the Fab Lab management software has been written entirely in JavaScript using <b>Node.js</b> as the server-side platform. In Node.js, dependencies and package installation and updating is managed through the <b>Node Packet Manager</b> (npm). When Node.js is deployed behind a proxy npm must be suitably configured in order to work correctly.  
</p>

<p align="justify">
In our specific case, the Fab Lab has been deployed in a complex enterprise network set-up that is not managed by us, but by the system administrators of our University. This means that the Pi-Gateway has neither a public IP address nor a direct access to the internet. If this is not your case, probably these considerations will not apply to you and you may skip this section. 
</p>
