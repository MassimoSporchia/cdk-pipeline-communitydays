#!/bin/bash
if test -d  /webapps/helloworld; 
    then
        echo "/webapps/helloworld exists";
    else
        echo "/webapps/helloworld doesn't exist";
        exit 1;
fi

sudo chmod 664 /etc/systemd/system/helloworld.service
sudo systemctl daemon-reload
sudo systemctl enable helloworld
sudo systemctl start helloworld