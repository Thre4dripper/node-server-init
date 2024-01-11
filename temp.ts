//TODO remove this file in production
import shell from 'shelljs'

(async () => {
    //remove dist folder
    shell.rm('-rf', 'dist')
    //build
    shell.exec('tsc')
    //clone template
    shell.cd('dist')
    shell.exec('git clone https://github.com/Thre4dripper/NodeTs-Express-Service-Based-Template template')
    //remove git
    shell.cd('template')
    shell.rm('-rf', '.git')

    //make two copies
    shell.cd('../')
    shell.cp('-R', 'template', 'template-ts')
    shell.cp('-R', 'template', 'template-js')

    //remove alternate src folder
    shell.cd('template-ts')
    shell.rm('-rf', 'src-javascript')
    shell.mv('src-typescript', 'src')

    shell.cd('../template-js')
    shell.rm('-rf', 'src-typescript')
    shell.mv('src-javascript', 'src')

    //remove template folder from dist
    shell.cd('../')
    shell.rm('-rf', 'template')

    //remove template folder from root
    shell.cd('../')
    shell.rm('-rf', 'template')
})()