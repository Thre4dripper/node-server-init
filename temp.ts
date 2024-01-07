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

    //remove template folder
    shell.cd('../../')
    shell.rm('-rf', 'template')
})()