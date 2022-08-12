#!/usr/bin/env node
const helper=`gtpm <command>

Usage:

gtpm setsrc <src>   init the project or set src to <src>
gtpm install        install all the dependencies in your project
gtpm install <foo>  add the <foo> dependency to your project
gtpm unstall <foo>  remove <foo> to your project
gtpm help           get help
gtpm config set <url>  set source to gtpm
`
const { countReset } = require('console');
const fs=require('fs');
const testmode=true;
const INSTALL=1,REMOVE=2;
let pos=testmode?2:1,mode=3;
if(process.argv[pos]=="install")mode=INSTALL;
else if(process.argv[pos]=="uninstall")mode=REMOVE;
else if(process.argv[pos]=="setsrc"){
    let SRC=process.argv[pos+1];
    try{
        fs.accessSync("gtpkg.json",fs.constants.F_OK);
    }catch(err){
        fs.writeFileSync("gtpkg.json",JSON.stringify({src:SRC,packages:[]}));
        process.exit(0);
    }
    let context=JSON.parse(fs.readFileSync("gtpkg.json").toString());
    if(context.src==SRC)process.exit(0);
    for(let i in context.packages){
        let thisfile=context.packages[i];
        console.log(`moving package ${thisfile}...`);
        fs.renameSync(`${context.src}/${thisfile}`,`${SRC}/${thisfile}`);
    }
    context.src=SRC;
    fs.writeFileSync("gtpkg.json",JSON.stringify(context));
    process.exit(0);
}else if(process.argv[pos]=="help"){
    console.log(helper);
    process.exit(0);
}else if(process.argv[pos]!="config"){
    console.log(helper);
    process.exit(0);
}
function mvpackage(src,name){
    fs.mkdirSync(`./${src}/${name}`);
    let dir=fs.readdirSync(`./node_modules/${name}/`);
    for(let j in dir){
        if(dir[j].includes('.json'))continue;
        if(dir[j].includes('.ts')||dir[j].includes('.js')){
            fs.renameSync(`./node_modules/${name}/${dir[j]}`,`./${src}/${name}/${dir[j]}`);
            console.log(`moving ${dir[j]} (from package ${name}).`);
        }
    }
}
function createQueue(){
    let queue=[]
    const enQueue=(data)=>{
        if(data==null)return;
        queue.push(data);
    }
    const deQueue=()=>{
        if(queue.length===0)return;
        const data=queue.shift();
        return data;  
    }
    const empty=()=>{
        return queue.length===0;
    }
    const getQueue=()=>{
        return Array.from(queue);
    }
    return{
        enQueue,
        deQueue,
        getQueue,
        empty
    }
}
if (require.main === module) {
  require('./lib/cli.js')(process,()=>{
    if(mode==3)return;
    const fs=require('fs');
    try{
        fs.accessSync("gtpkg.json",fs.constants.F_OK);
    }catch(err){
        console.log("Unable to find gtpkg.json, please create using setsrc.")
        return;
    }
    let context=JSON.parse(fs.readFileSync("gtpkg.json").toString());
    if(mode==INSTALL){
        let v=0;
        let packages=[];
        if(process.argv[pos+1]==undefined){
            let backcontext=JSON.parse(fs.readFileSync('package.json').toString());
            v=1;
            for(let i in backcontext.dependencies)
                if(i.includes("-gt")&&(!context.packages.includes(i)))
                    packages.push(i);
        }
        if(v=0)packages=process.argv.slice(pos+1);
        let pack=[],vis={};
        for(let i in packages){
            if(vis[packages[i]])continue;
            if(packages[i].includes('registry')||packages[i].includes('http'))continue;
            pack.push(packages[i]);
            let q=createQueue();
            q.enQueue(packages[i]);
            while(!q.empty()){
                let u=q.deQueue();
                vis[u]=1;
                let back=JSON.parse(fs.readFileSync(`./node_modules/${u}/package.json`).toString());
                for(let j in back.dependencies){
                    if(j.includes("-gt")&&(!context.packages.includes(j))){
                        console.log(`It has been found that ${j} depends on ${u} and joins the installation queue.`);
                        q.enQueue(j);
                        pack.push(j);
                    }
                }
            }
        }
        for(let i in pack){
            if(context.packages.includes(pack[i])){
                console.log(`The package ${pack[i]} was installed.`)
                continue;
            }
            context.packages.push(pack[i]);
            mvpackage(context.src,pack[i]);
        }
        fs.writeFileSync("gtpkg.json",JSON.stringify(context));
    }else{
        let newcontext=[];
        let packages=process.argv.slice(pos+1);
        for(let i in context.packages){
            if(packages.includes(context.packages[i]))continue;
            newcontext.push(context.packages[i]);
        }
        context.packages=newcontext;
        for(let i in packages){
            console.log(`removing ${packages[i]}...`);
            fs.readdirSync(`${context.src}/${packages[i]}/`).forEach(function (fileName) {
                fs.unlinkSync(`${context.src}/${packages[i]}/` + fileName);
            });
            fs.rmdirSync(`${context.src}/${packages[i]}`);
        }
        fs.writeFsileSync("gtpkg.json",JSON.stringify(context));
    }
  });
} else {
  throw new Error('The programmatic API was removed in npm v8.0.0')
}
