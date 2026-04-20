## **Product Requirement Document / Specification**

## **Overview**

Using a “To-Do” Application Use Case, create a single monorepo system of deployables, clients, and libraries skeleton projects that aim to do 2 things:

1. Enrich the To-Do Product & Project Skeleton System with a variety of deployment types with similar boilerplate capabilities that can be cloned or re-used for other projects.  
2. Each expand the To-Do product’s capabilities, either by adding new features to the product or providing a new client for a User to Utilize the To-Do product

## **Root “System Skeleton” Mono Repo**

At the root of the monorepo should be shared modules and libraries relevant to subsets of the child skeleton project directories.

1. Common Types used by the System that can be used to minimize duplication of internal models used inside skeleton projects.  
2. Common Infrastructure as Code Modules, such as modules for deployment of Databases, Queues, etc in both a Self Hosted Kubernetes Cluster environment or an IaaP provider such as AWS.

Aside from these common folders and some system configuration and documentation files in the root directory, all other folders should represent a “Project Skeleton.”

### **Each Project Skeleton should be and/or contain:**

1. \[A Deployable\] Be a self contained deployable that can be built and deployed individually  
2. \[A Standalone Project Skeleton\]If so chosen, can be dragged and dropped into its own separate repository with little to no breakage.  
3. \[Documentation\] Should define its application design, dependencies, development environment information, development tools and workflows, deployment strategies, test strategies, context on large features, API documentation if hosting an API Service. It should also have documentation describing and setting the expected folder structure of the project repository.  
4. \[Deployment\] On top of deployment mechanisms for a cloud IaaP hosted “Production” environment, as well as an On-Premise (Self) hosted “Staging” environment, each deployable should have the ability to be built & deployed in a “Local” environment on a developer’s computer via scripts and containerized when applicable.  
5. \[Infrastructure\] If the deployable depends on an external service or infrastructure, such as a database instance, a queue, load balancer, api gateway, pub/sub messaging system, etc, it should have a folder than is able to deploy an appropriate set of resources for running the deployable in each of the 3 necessary deployment environments (production, staging, local).  
6. \[Testing\] If automated testing is possible for the type of deployable, each project skeleton should self contain E2E, Component-Level Integration tests that can be run against a staging or local environment as well as Code-Level Integration, & Unit Test code and scripts for running in IDEs or the Terminal.  
7. \[Code Styling and Standards\] Each project skeleton should also contain configurations to run linters, code formatters, validation tools that help maintain a consistent code style, folder organization, and other relevant patterns.

### **General Outline for “To-Do Product” Root System**

1. Root of System Skeleton Mono Repo  
   1. Types  
   2. Infrastructure  
   3. \[Astro\] Static Page generation for To-Do Product Landing Page  
   4. \[Vite\] Progressive Web Application UI Client (To-Do Web Client) using Vite  
   5. \[Nest.JS \- gRPC\] Web Service Application (To-Do Data Services) to power UI Client  
   6. \[Nest.JS \- HTTP\] Web Service Application (User Data Services) to provide user data  
   7. \[Next.JS\] SSR Web Application that Provides a more Full Featured To-Do / Task Management Application using base To-Do & User Services along with its own integrated data from its own database.  
   8. \[iOS\] To-Do iOS Client  
   9. \[Android \- Kotlin\] To-Do Android Client  
   10. \[Chrome Extension\] Create and Manage To-Do List from a Chromium Browser

