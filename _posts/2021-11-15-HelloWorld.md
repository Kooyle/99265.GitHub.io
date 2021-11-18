---
layout: post
title:  "Hello World!"
date:   2021-11-15 19:28:39 +0800
categories: jekyll
---
### 首次使用Jekyll
>很不错的东西,因为可以免费托管到 Github Pages.

### 安装的坎坷路

- 安装WSL,控制面板->程序->启用或关闭Windows功能
> 基于Linux的Windows子系统,勾选,确定.

- 在Microsoft Store商店安装Ubuntu20.04LTS
- 如果不使用root用户,直接打开,设置密码时,虽然无显示,实际上已经输入了!

```powershell
  ubuntu2004.exe config --default-user root
```
- 在Ubuntun-20.04中运行

```shell
  #设置目录可写
  chmod -R 777 .
  #修改软件源可写
  chomd 777 ../etc/apt/sources.list
  cp ../etc/apt/sources.list ../etc/apt/sources.list.bak
```
- 修改源文件 /etc/apt/sources.list 使用阿里云的CDN

```txt
deb http://mirrors.aliyun.com/ubuntu/ focal main restricted
deb http://mirrors.aliyun.com/ubuntu/ focal-updates main restricted
deb http://mirrors.aliyun.com/ubuntu/ focal universe
deb http://mirrors.aliyun.com/ubuntu/ focal-updates universe
deb http://mirrors.aliyun.com/ubuntu/ focal multiverse
deb http://mirrors.aliyun.com/ubuntu/ focal-updates multiverse
deb http://mirrors.aliyun.com/ubuntu/ focal-backports main restricted universe multiverse
deb http://mirrors.aliyun.com/ubuntu/ focal-security main restricted
deb http://mirrors.aliyun.com/ubuntu/ focal-security universe
deb http://mirrors.aliyun.com/ubuntu/ focal-security multiverse
```
- 安装环境

```shell
  apt install ruby
  #检查版本
  ruby -v

  apt install bundle
  #检查版本
  bundle -v

  apt install gem
  gem update --system
  #检查版本
  gem -v
  #如果下载异常  更换源
  #gem sources --add https://gems.ruby-china.com/ --remove https://rubygems.org/

  apt install jekyll
  #检查版本
  jekyll -v

  gem install jekyll bundler
  #创建你的静态博客
  jekyll new my-awesome-site
  #进入你的静态博客目录
  cd my-awesome-site
  #安装服务器
  bundle install
  #运行服务器
  #如果出错看看出错的模块用 xxx>1.2
  #gem install [错误模块]
  bundle exec jekyll serve
  #明明已经下载,依旧报错?删掉目录重新创建.
```
- 浏览器打开http://127.0.0.1:4000/

### 参考
- [Jekyllcn]
- [Ruby China]



[Ruby China]://gems.ruby-china.com/
[Jekyllcn]://jekyllcn.com/
