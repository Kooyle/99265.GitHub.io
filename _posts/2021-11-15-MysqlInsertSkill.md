---
layout: post
title:  "MYSQL 有则更新无则插入"
date:   2021-11-15 19:28:39 +0800
categories: MySQL
---
### 语句
>在抓取某些网站数据的时候,涉足插入更新

```mysql
INSERT  INTO `mydb` (`id`, `contents`,`title`)
              values ('1','nenge.net','能哥网')
              ON DUPLICATE KEY UPDATE
              contents=values(contents),title=values(title);
```
