#!/usr/bin/env node
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
    console.log("done.");
    process.exit(0);
}
if (require.main === module) {
  require('./lib/cli.js')(process,()=>{
    if(mode==3)return;
    const fs=require('fs');
    try{
        fs.accessSync("gtpkg.json",fs.constants.F_OK);
    }catch(err){
        console.log("Unable to find gtpkg.json, please create using setsrc.")
    }
    let context=JSON.parse(fs.readFileSync("gtpkg.json").toString());
    if(mode==INSTALL){
        let packages=process.argv.slice(pos+1);
        for(let i in packages){
            if(packages[i].includes('registry')||packages[i].includes('http'))continue;
            fs.mkdirSync(`./${context.src}/${packages[i]}`);
            context.packages.push(packages[i]);
            let dir=fs.readdirSync(`./node_modules/${packages[i]}/`);
            for(let j in dir){
                if(dir[j].includes('.json'))continue;
                if(dir[j].includes('.ts')||dir[j].includes('.js')){
                    fs.renameSync(`./node_modules/${packages[i]}/${dir[j]}`,`./${context.src}/${packages[i]}/${dir[j]}`);
                    console.log(`moving ${dir[j]} (from package ${packages[i]}).`);
                }
            }
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