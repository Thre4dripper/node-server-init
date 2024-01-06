import { ProjectConfig } from "./interfaces";
// {
//     projectName: 'my-project',
//         installationType: 'custom',
//     projectType: 'ts',
//     apis: [ 'post' ],
//     socket: false,
//     database: 'mongo',
//     swagger: { enabled: true, path: '/swagger' },
//     docker: true
// }
export const install = async (projectConfig: ProjectConfig) => {
    console.log(projectConfig)
    await new Promise(resolve => setTimeout(resolve, 1000))
}