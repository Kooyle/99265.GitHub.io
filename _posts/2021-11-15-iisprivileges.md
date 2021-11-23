---
layout: post
title:  "IIS的匿名权限使用"
date:   2021-11-15 19:28:39 +0800
categories: iis
---

### IIS匿名用户
>虽然IIS有匿名用户,但是权限原因,导致的很多人直接给管理员权限.

- 解决方法

```batch
  icacls c:\wwwroot /C /grant "IIS AppPool\DefaultAppPool":(CI)(OI)RW
```
- 给c:\wwwroot 新增了一个 DefaultAppPool 的用户.DefaultAppPool是IIS里面的应用池的名字.
- 当应用池的运行标识为ApplicationPoolIdentity,那么他的运行权限就算应用池的名字.
