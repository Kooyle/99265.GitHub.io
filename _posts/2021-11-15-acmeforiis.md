---
layout: post
title:  "acme免费申请泛域名SSL IIS方法"
date:   2021-11-15 19:28:39 +0800
categories: acme
---
### 安装WSL ubuntu-20.04LTS
- 参考 [ubuntu-20.04LTS安装]({% link _posts/2021-11-15-HelloWorld.md %})

### 安装Acme.sh
```shell
  wget -O - https://get.acme.sh | sh
  #或 curl https://get.acme.sh | sh

  sh .acme.sh/acme.sh --upgrade

  #API参数 阿里云KEY#
  export Ali_Key="..."
  export Ali_Secret="..."
  #申请SSL 如果出错,可能被墙了,或者域名记录已存在,需要手动去删除再试.
  sh .acme.sh/acme.sh --issue --dns dns_ali -d nenge.net -d *.nenge.net
  #生成IIS用的PFX
  openssl pkcs12 -export -out .acme.sh/nenge.net/nenge.net.pfx -in .acme.sh/nenge.net/nenge.net.cer -inkey .acme.sh/nenge.net/nenge.net.key -certfile .acme.sh/nenge.net/ca.cer -passout pass:123456
  #复制到D盘
  cp .acme.sh/nenge.net/nenge.net.pfx /mnt/d/nenge.net.pfx
```

### 参考
- [Acme.sh中文文档](https://github.com/acmesh-official/acme.sh/wiki/%E8%AF%B4%E6%98%8E)
