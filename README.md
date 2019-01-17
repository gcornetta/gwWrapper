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
2. [Software and Infrastructure description](#software-description)
   * [Running npm behind a proxy](#npm-proxy)
   * [Some Tinyproxy limitations](#tinyproxy-limitations)
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
# Software and infrastructure description
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

<p align="justify">
Deploying the Fab Lab infrastructure in an enterprise network that is not managed by you, could result particularly challenging. More specifically, in our case:
  <ul>
    <li>The Pi-Gateway has no direct Internet access necessary to reach the Cloud Hub infrastructure.</li>
    <li><p align="justify">
        The Cloud Hub is tightly integrated with AWS managed services and uses <b>Route 53</b> for name resolution (DNS). Unfortunately,
        this service is not visible from the VPN tunnel; thus, a lightweight DNS service (<b>Dnsmasq</b>) must be deployed on the cloud side of the
        infrastructure to resolve network names into IP addresses,</p></li>
    <li><p align="justify">
        HA-Proxy, that is used to load balance the incoming requests among the services deployed on the cloud infrastructure, cannot
        work as a forward proxy; thus, it is necessary to the deploy on the cloud end also a lightweight proxy service   
        (<b>Timyproxy</b>) in order to forward to the internet the requests coming from the Pi-Gateway.</p></li>
  </ul>
</p>

<p align="justify">
Fig. 1 depicts the cloud architecture and services to allow outgoing requests from the Pi-Gateway to the internet. Observe that the <b>Fab Lab Gateway</b> is a router/firewall that belongs to the enterprise network. It is not part of the Fab Lab infrastructure and is managed by the our University network administrators.
</p>

<figure>
  <p align="center">
    <img src="/docs/images/cloud-arch.png" alt="CLOUD ARCHITECTURE"/>
    <figcaption>Fig. 1 - Cloud Configuration to Support Internet Access from the Pi-Gateway.</figcaption>
  </p>
</figure>

<p align="justify">
Once the DNS and proxy services have been correctly configured, the npm package installed on the Pi-Gateway must be configured as well in order to correctly operate behind a proxy. This can be done by either using the npm command line interface or directly editing with your favourite editor the <b>.npmrc</b> file located in the Pi-Gateway home directory specifying the URL and listening port of the proxy service. Please, observe, that in the VPN configuration of Fig. 1 all the services communicate using private IP addresses. The configuration file is reported in the sequel:
</p>

```
proxy=http://<proxy_private_ip_address>:<proxy_port_number>
https-proxy=http://<proxy_private_ip_address>:<proxy_port_number>
strict-ssl=false
ca=null
registry=http://registry.npmjs.org

```

<a name="tinyproxy-limitations"></a>
## Some Tinyproxy limitations
<p align="justify">
  <b>Tinyproxy</b> is a lightweight proxy service easy to install, deploy and configure. However, there is a limitation when used with the Fab Lab APIs Wrapper. The APIs Wrapper supports both HTTP and HTTPS connection. Unfortunately, this HTTPS connections cannot be used with the actual software infrastructure because Tinyproxy does not accept incoming HTTPS connections. HTTPS connections in Tinyproxy are only supported using the <b>CONNECT</b> method which implies that the browser/client must know a-priori it is talking to a proxy server and use <b>CONNECT</b> to implement a connection.  
</p>

<p align="justify">
  This indeed is not a security issue since the information is already encrypted in the <b>IPSec</b> tunnel that connects the Fab Lab to the cloud infrastructure; however, if one would like to implement a transparent proxy supporting also HTTPS connection, <b>Squid</b>  can be used instead of Tinyproxy. Nonetheless, Squid is not so easy to configure and deploy as Tinyproxy is. 
</p>

# Documentation and developer support

<p align="justify">
The Fab Lab software infrastructure has been designed with the developer in mind. For this reason, Swagger has been integrated into the Pi-Gateway and the Pi-Wrapper middleware. This allow the developer to have on-line access to the API documentation and to test the native APIs through the Swagger User interface (Swagger UI).  In addition, the API-first approach used to the develop the Fab Lab software allows to easily expand the software, the protocol stack and add new features adding new layers on top of the native APIs without the need of modifying the core software architecture.
</p>

<a name="machine-apis"></a>
## Machine APIs
<p align="justify">
Machine wrapper APIs expose methods to add, remove and modify jobs in a machine. These methods can be only accessed from the Fab Lab Gateway (i.e. the Pi-Gateway).
  
Table 2 displays the resource URI and the implemented HTTP verbs for the Machine Wrapper (i.e. the Pi-Wrapper) APIs. 
</p>

<table>
  <caption>Table 2: MAchine Wrapper APIs</caption>
  <tr>
    <th>Resource</th>
    <th>GET</th>
    <th>POST</th>
    <th>PUT</th>
    <th>DELETE</th>
  </tr>
  <tr>
    <td>/api/login</td>
    <td>Error 400 <br>(<span style="font-weight:bold">Bad Request</span>)</td>
    <td>Returns a JWT <br>if login is correct; <br>otherwise displays<br>an error<br>(<span style="font-weight:bold">401 Unauthorized</span>)</td>
    <td>Error 400 <br>(<span style="font-weight:bold">Bad Request</span>)</td>
    <td>Error 400<br>(<span style="font-weight:bold">Bad Request</span>)</td>
  </tr>
  <tr>
    <td>/api/jobs</td>
    <td>Returns an array <br>with all the jobs</td>
    <td>Submit a job <br>for fabrication</td>
    <td>Error 400 <br>(<span style="font-weight:bold">Bad Request</span>)</td>
    <td>Error 400<br>(<span style="font-weight:bold">Bad Request</span>)</td>
  </tr>
  <tr>
    <td>/api/jobs/1234</td>
    <td>Show the status <br>of the job with <br>id=1234</td>
    <td>Error 400<br>(<span style="font-weight:bold">Bad Request</span>)</td>
    <td>Updates the status <br>of the job with <br>id=1234</td>
    <td>Deletes a job if it exists; <br>otherwise displays <br>an error <br>(<span style="font-weight:bold">404 Not found</span>)</td>
  </tr>
  <tr>
    <td>/api/jobs?user=123&amp;machine=laser%20cutter<br>&amp;process=cut&amp;material=wood</td>
    <td>Error 400 <br>(<span style="font-weight:bold">Bad Request</span>)</td>
    <td>Submit a job <br>to the Machine</td>
    <td>Error 400 <br>(<span style="font-weight:bold">Bad Request</span>)</td>
    <td>Error 400<br>(<span style="font-weight:bold">Bad Request</span>)</td>
  </tr>
</table>

<a name="versioning"></a>
### Versioning

API versioning is not mandatory for machine wrapper APIs.

<a name="supported-formats"></a>
### Supported formats
Machine wrapper APIs exclusively support JSON format.

<a name="error-management"></a>
### Error management

The API error codes will match HTTP codes. The following cases are managed:

1.	Everything worked (success): **200–OK**.
2.	The application did something wrong (client error): **400–Bad Request**. 
3.	The API did something wrong (server error): **500–Internal Server Error**.

<p align="justifyr">
In the case of client and server error, the server will return in the response a JSON object with error details and hints to correct it. The message has the following format:
</p>

<p align="center">
  <code>
    {code: the error code, message: the error message, details: the error details}
  </code>
</p>

Table 3 reports error codes and details.

<table>
  <caption>Table 3: Machine Wrapper Error Codes</caption>
  <tr>
    <th>Error Code</th>
    <th>Error Details</th>
  </tr>
  <tr>
    <td>20</td>
    <td>Machine not found</td>
  </tr>
  <tr>
    <td>21</td>
    <td>Bad request</td>
  </tr>
  <tr>
    <td>22</td>
    <td>Unsupported file format</td>
  </tr>
  <tr>
    <td>23</td>
    <td>mkdir -p error</td>
  </tr>
  <tr>
    <td>24</td>
    <td>FIFO error</td>
  </tr>
  <tr>
    <td>25</td>
    <td>Missing attachment</td>
  </tr>
  <tr>
    <td>26</td>
    <td>Machine update error</td>
  </tr>
</table>

