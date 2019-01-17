[![Build Status](https://travis-ci.com/gcornetta/gwWrapper.svg?branch=master)](https://travis-ci.com/gcornetta/gwWrapper)
[![Known Vulnerabilities](https://snyk.io/test/github/gcornetta/gwWrapper/badge.svg)](https://snyk.io/test/github/gcornetta/gwWrapper)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

![NEWTON BANNER](/docs/images/banner.png)

# Fab Lab Modules: Fab Lab APIs Wrapper (Pi-Gateway)
<p align="justify">
This software is part of a larger suite of microservices designed to remotely manage digital fabrication equipment in a loosely coupled and distributed environment. More specifically, the software in this repo implements a wrapper for the Fab Lab APIs with basic security policies. Fab Lab machines are not directly exposed to the internet, but rather they are protected by a Gateway which is the entry point to Fab Lab fabrication resources. The Gateway is responsible for managing Fab Lab access, routing incoming fabrication requests to available machines and interacting with the Cloud Hub to control fabrication status. The Fab Lab APIs wrapper has be designed to work either as a standalone application or behind a more feature-rich and general-purpose gateway as, for example, <a href="https://www.express-gateway.io/">Express Gateway</a>. All the Gateway software infrastructure can be orchestrated by a CLI that at the moment has not been open-sourced; however, the CLI is not necessary to control the Fab Lab APIs wrapper.
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
   * [Fab Lab APIs](#fablab-apis)
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

1. Node.js >= v8.x
2. npm >= v6.0.x
3. Redis v4.x
4. Express Gateway v1.x (optional)

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

<a name="fablab-apis"></a>
## Fab Lab APIs
<p align="justify">
Fab Lab APIs expose the underlying digital fabrication machines as software service that can be accessed from the Cloud Hub. 
These APIs are the entry point for the Fab Lab infrastructure and provide software methods that can be exploited to remotely control and monitor the digital fabrication machines using the cloud application interfaces.
The Fab Lab APIs implement methods to get Fab Lab status and API quota, to delete a job submitted for fabrication and to send a fabrication request. Table 1 displays the resource URI and the implemented HTTP verbs for the Fab Lab APIs. 
</p>

<table>
  <caption>Table 2: Fab Lab APIs</caption>
  <tr>
    <th>Resource</th>
    <th>GET</th>
    <th>POST</th>
    <th>PUT</th>
    <th>DELETE</th>
  </tr>
  <tr>
    <td>/fablab</td>
    <td>Shows the Fab Lab information</td>
    <td>Error 400 <br>(<span style="font-weight:bold">Bad Request</span>)</td>
    <td>Error 400 <br>(<span style="font-weight:bold">Bad Request</span>)</td>
    <td>Error 400<br>(<span style="font-weight:bold">Bad Request</span>)</td>
  </tr>
  <tr>
    <td>/fablab/quota</td>
    <td>Shows the available API quota of the Fab Lab</td>
    <td>Error 400 <br>(<span style="font-weight:bold">Bad Request</span>)</td>
    <td>Error 400 <br>(<span style="font-weight:bold">Bad Request</span>)</td>
    <td>Error 400<br>(<span style="font-weight:bold">Bad Request</span>)</td>
  </tr>
  <tr>
    <td>/fablab/jobs/status/1234</td>
    <td>Show the status <br>of the job with <br>id=1234</td>
    <td>Error 400<br>(<span style="font-weight:bold">Bad Request</span>)</td>
    <td>Error 400<br>(<span style="font-weight:bold">Bad Request</span>)</td>
    <td>Error 400<br>(<span style="font-weight:bold">Bad Request</span>)</td>
  </tr>
  <tr>
    <td>/fablab/jobs?user=123&machine=laser%20cutter&process=cut&material=wood</td>
    <td>Error 400 <br>(<span style="font-weight:bold">Bad Request</span>)</td>
    <td>Submit a job <br>to a fablab specifying the user the machine types and the fabrication parameters in the query string</td>
    <td>Error 400 <br>(<span style="font-weight:bold">Bad Request</span>)</td>
    <td>Error 400<br>(<span style="font-weight:bold">Bad Request</span>)</td>
  </tr>
  <tr>
    <td>/fablab/jobs/1235</td>
    <td>Error 400 <br>(<span style="font-weight:bold">Bad Request</span>)</td>
    <td>Error 400 <br>(<span style="font-weight:bold">Bad Request</span>)</td>
    <td>Error 400 <br>(<span style="font-weight:bold">Bad Request</span>)</td>
    <td>Delete the job <br>whose <b>id</b> is specified in the URL path</td>
  </tr>
</table>

<a name="versioning"></a>
### Versioning

API versioning is not mandatory for Fab Lab APIs.

<a name="supported-formats"></a>
### Supported formats
Fab Lab APIs exclusively support JSON format.

<a name="error-management"></a>
### Error management

The API error codes will match HTTP codes. The following cases are managed:

1.	Everything worked (success): **200–OK**.
2.	The application did something wrong (client error): **400–Bad Request**. 
3.	The API did something wrong (server error): **500–Internal Server Error**.

<p align="justify">
In the case of client and server error, the server will return in the response a JSON object with error details and hints to correct it. The message has the following format:
</p>

<p align="center">
  <code>
    {code: the error code, message: the error message, details: the error details}
  </code>
</p>

Table 2 reports error codes and details.

<table>
  <caption>Table 2: Fab Lab API Wrapper Error Codes</caption>
  <tr>
    <th>Error Code</th>
    <th>Error Details</th>
  </tr>
  <tr>
    <td>1</td>
    <td>Fab Lab communication error</td>
  </tr>
  <tr>
    <td>2</td>
    <td>Database error</td>
  </tr>
  <tr>
    <td>3</td>
    <td>The Fab Lab object has not been built yet</td>
  </tr>
  <tr>
    <td>4</td>
    <td>Unknown authorization error</td>
  </tr>
  <tr>
    <td>5</td>
    <td>Unknown machine error</td>
  </tr>
  <tr>
    <td>6</td>
    <td>Database error. Cannot read</td>
  </tr>
  <tr>
    <td>7</td>
    <td>Fab Lab busy</td>
  </tr>
    <tr>
    <td>8</td>
    <td>Database error. Cannot write</td>
  </tr>
    <tr>
    <td>9</td>
    <td>API quota consumed</td>
  </tr>
    <tr>
    <td>10</td>
    <td>Cannot connect to target machine</td>
  </tr>
    <tr>
    <td>11</td>
    <td>Undefined user</td>
  </tr>
    <tr>
    <td>12</td>
    <td>Undefined machine</td>
  </tr>
    <tr>
    <td>13</td>
    <td>Invalid route. Job not in database</td>
  </tr>
    <tr>
    <td>14</td>
    <td>Database error. Cannot delete</td>
  </tr>
</table>

<a name="on-line-documentation"></a>
### On-line documentation

The Fab Lab APIs documentation can be accessed from the Fab Lab network at the following URL:

<p align="center">
  <code>
    http://gateway_name.local:3000/docs
    </code>
    </p>

<p align="justify">
This URL leads to the Pi-Gateway API documentation landing page depicted in Fig. 2. <b>Please note that Swagger UI HTML code is linked to external stylesheets and javascript code; thus you must ensure your network has external connectivity in order to use this feature</b>.
</p>

<figure>
  <p align="center">
    <img src="/docs/images/api-landing-page.png" alt="API DOCUMENTATION LANDING PAGE"/>
    <figcaption>Fig. 2 - The API Documentation Landing Page.</figcaption>
  </p>
</figure>

<p align="justify"> 
The documentation page allows navigating through the API paths and allowed HTTP verbs; for example, the screenshot of Fig. 3 depicts the documentation page of the API invoked by executing a GET request to the Fab Lab Gateway base URL.
</p>

<figure>
  <p align="center">
    <img src="/docs/images/api-documentation-GET.png" alt="API DOCUMENTATION"/>
    <figcaption>Fig. 3 - API Documentation for a GET Request to the Gateway Base URL.</figcaption>
  </p>
</figure>

<p align="justify">
The page shows the API description and an example of API response with 200 status code. In the case of API with content negotiation, the interface also allows selecting the response type. Finally, the interface has a “Try it out” button that allows to perform a request to the API and check the response in the web user interface.
When the “Try it out” button is pressed, the user is redirected to another page that allows to submit to the API, query string parameters, forms, files, etc.  (see Fig. 4). In the case of Fig. 4, the API call is very simple and has no parameters.
</p>

<figure>
  <p align="center">
    <img src="/docs/images/api-documentation-submit.png" alt="API SUBMISSION FORM"/>
    <figcaption>Fig. 4 - API Call Submission Form.</figcaption>
  </p>
</figure>

<p> 
Finally, Fig. 5 depicts the API response obtained after pressing the execute button.
</p>

<figure>
  <p align="center">
    <img src="/docs/images/api-documentation-response.png" alt="API RESPONSE"/>
    <figcaption>Fig. 5 - Example of Gateway API Response.</figcaption>
  </p>
</figure>

<a name="api-responses"></a>
### APIs responses

#### Tell me about the Fab Lab

```
GET /fablab
```

_Response_:

```
200 OK
{
“fablab”: {
  “id”: 1234
  .... 
},
 “jobs”: {
  ....
 }
}
```
#### Tell me about the Fab Lab quota

```
GET /fablab/quota
```

_Response_:

```
200 OK
{
“id”: 1234,
“quota”: 2000
}
```

#### Submit a job

```
POST /fablab/jobs?user=1234&machine=laser%20cutter&process=cut&material=wood
```

_Response_:

```
200 OK
{
“id”: 1234,
“mId”: 3456,
“jobId”: 4567
}
```
<p align="justify">
Recall, that with this method a design file in PNG format is uploaded on the server. Our API specifications correspond to the HTTP request depicted below.
</p>

```
POST /fablab/jobs
Host: pigateway.local/public/uploads
Content-Type: multipart/form-data; boundary=----WebKitFormBoundaryqzByvokjOTfF9UwD
Content-Length: 204

------WebKitFormBoundaryqzByvokjOTfF9UwD
Content-Disposition: form-data; name="design"; filename="design.png"
Content-Type: image/png

File contents go here.

------WebKitFormBoundaryqzByvokjOTfF9UwD--
```

#### Tell me about a job

```
GET /fablab/jobs/1234
```

_Response_:

```
200 OK
{
   “id”: 1235
 
}
```

#### Cancel a job

```
DELETE /fablab/jobs/1235
```

_Response_:

```
200 OK
```

<a name="websites"></a>
# Websites

1. [Newton Fab Labs on Github](https://gcornetta.github.io/piwrapper/)
2. [Newton Project Page](http://www.newtonproject.eu) 

<a name="contribution-guidelines"></a>
# Contribution guidelines

Please see [CONTRIBUTING](CONTRIBUTING.md) and [CONDUCT](CONDUCT.md) for details.

<a name="license"></a>
# License

This software is licensed under MIT license unless otherwise specified in the third-party modules included in this package.  
