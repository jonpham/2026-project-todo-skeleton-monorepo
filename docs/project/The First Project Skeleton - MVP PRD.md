# [Product Spec] Web & Mobile Application Project Skeleton

## The First Project Skeleton - MVP PRD

For the very first Project Skeleton in the Skeleton Mono-Repo, I’d like to start with a Simple React Single Page Progressive Web Application built on the Vite Framework/Toolchain.

User features:

- Create To-Do Item with a Text Description and a Completion Status
- Update a To-Do Item’s Text Description
- Mark a To-Do Item Complete
- Delete a To-Do Item
- Show a List of Existing To-Do Items with Checkbox displayed followed by item description
- Show To-Do Items as completed by striking through text and checking Checkbox

Application Features:

- To-Do Items are stored in browser local storage, session storage
- All data actions are performed through a web worker to allow abstraction and eventual handling of data persistence, syncing, and offline behavior to a hosted data service.
- Web Application is able to be saved offline as a Progressive Web Application on iOS and Android Devices

Application Features:

On top of my Typescript-based Node.JS Toolchain preferences that will be listed below:

- Built on Vite Web Application framework
- integration with Github CI/CD Workflows
- Code Linting and Styling as part of Git commit and push hooks
- Unit Tests via Vitest
- React UI Components and JSX
- Storybook Component and UI  Component Testing
- Playwright E2E Testing
- Deployment to Local Environment
- Run of unit tests, linting, and code cleanup before each Github push
- Run of unit tests, code formatting and code style checks, integration tests and production deployment on GitHub Pull Request when new commits are added.
- Deployment to Production environment on merge to primary `development` branch
- A Dockerized Container with a web-server host for Staging Environments
- Potentially Production Deployment to a PaaS such as Netlify, Cloudflare Pages, or Render