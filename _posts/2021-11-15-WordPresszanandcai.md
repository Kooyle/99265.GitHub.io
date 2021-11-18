---
layout: post
title:  "WordPress增加点赞,评论顶/踩,文章访问数"
date:   2021-11-15 19:28:39 +0800
categories: Wordpress
---

>主要利用wp_postmeta,wp_commentmeta进行记录数据.  
再利用indexDB进行本地记录判断,代替以往的cookies方式记录.  
当然他的缺点比cookies的安全性更致命!  
随便来个C语言大佬可以一句代码刷爆你的赞数.  
要安全性最好还是记录IP.O(∩_∩)O.  
大概比较适合小站!

### 流程
- 后台文件 /wp-content/themes/[风格文件]/functions.php

```php
<?php
//绑定  /wp-admin/admin-ajax.php 行为事件
add_action('wp_ajax_nopriv_like_click', 'like_click');
add_action('wp_ajax_like_click', 'like_click');
function like_click(){
	$id = $_POST["id"];
	if(!$id) ShowJson($json);
	$actionKey = $_POST["key"];
	if(!$actionKey) ShowJson($json);
	$actionKey = explode ('_',$actionKey);
	if(!$actionKey[1]) ShowJson($json);
	else $key = 'likeClick_'.$actionKey[1];
	if($actionKey[2]) $key .= ucfirst($actionKey[2]);
	$json = array('result'=>false);
    if($actionKey[1]=='post')$likeClick_raters = intval(get_post_meta($id,$key,true));
	if($actionKey[1]=='comment')$likeClick_raters = intval(get_comment_meta($id,$key,true));
	if(!isset($likeClick_raters)) ShowJson($json);
	if ( $actionKey[0] == 'add'){
		$likeClick_raters += 1;
		$json['num'] = $likeClick_raters;
		$json['result'] = true;
    }else if (  $actionKey[0] == 'remove'){
		$likeClick_raters-=1;
		$json['num'] = $likeClick_raters;
	}
    if($actionKey[1]=='post')update_post_meta($id, $key, $likeClick_raters);
	if($actionKey[1]=='comment')update_comment_meta($id, $key, $likeClick_raters);
	ShowJson($json);
	exit;
}
function ShowJson($json)
{
	echo json_encode($json);
	exit;
}

?>
```

- 模板调用
>这是一个自定义HTML 符合两个英文之间有个横线的格式 the_ID() 是文章的ID

```php
<like-click data-id="post-<?php the_ID(); ?>">
<span class="likes_count"><?php echo intval(get_post_meta(get_the_ID(),'likeClick_post',true));?></span>
</like-click>

<!-- 自启动并且执行一次 不绑定点击事件 -->
<like-click data-id="post_view-<?php the_ID(); ?>" data-once="1">
<span class="likes_count"><?php echo intval(get_post_meta(get_the_ID(),'likeClick_postView',true));?></span>
</like-click>
```
- Javacript处理

```javascript
NengeNet = new class NengeApp{
    //localForage  http://localforage.docschina.org/
    DB = localForage.createInstance({'name': NengeNet,'storeName': "IndexPage"});
    constructor() {
        this.DB.keys().then(db_list => {
            this.DB_Ready();
        });
    }
    DB_Ready(){
        let N = this;
        /*创建一个自定义HTML元素映射 */
        N.createElement('like-click',function(type,element){
            let tagName = element.tagName.toLowerCase(),
                id = element.getAttribute('data-id'),
                once = element.getAttribute('data-once')&&true,
                func = (id)=>{
                    let data = N.CustomElemtData[tagName]||{};
                    if(data[id]){
                      //发现本地记录,HTML为点赞状态
                        element.querySelector('.like-words')&&(element.querySelector('.like-words').innerHTML='取消赞');
                        element.classList.add('active');
                    }else if(once){
                        console.log('运行一次');
                        N._Click_like(element)
                    }
                };
            if(!once)element.onclick = ()=>{N._Click_like(element);};
            if(N.CustomElemtData[tagName]){
                if(id){
                    func(id);
                }
                return ;
            }
            N.DB.getItem(tagName,(err,data)=>{
                N.CustomElemtData[tagName] = data;
                if(id){
                    func(id);
                }
            });
        });
    }
    _Click_like(elm) {
        let tagName = elm.tagName.toLowerCase(),
            dataId = elm.getAttribute('data-id'),
            dataArr = dataId.split('-'),
            dataNum = parseInt(dataArr[1]),
            dataKey = ['post','post_view','comment_zan','comment_cai'].includes(dataArr[0])&&dataArr[0],
            tagData = this.CustomElemtData[tagName]||{},
            isData = tagData[dataId];
            if(elm.getAttribute('data-lock'))return ;
            elm.setAttribute('data-lock',1);
        if (dataNum&&dataKey) {
            let setData = {
                    'action': tagName.replace('-','_'),
                    'id': dataNum,
                    'key': (isData==true ? 'remove':'add')+'_'+dataKey
                },
                bodyData = new FormData();
            for (var i in setData) {bodyData.append(i, setData[i]);}
            fetch(new Request('/wp-admin/admin-ajax.php', {
                'method': "POST",
                'body': bodyData
            })).then(response => response.json()).then(v => {
                let elmTxt = elm.querySelector('.like-words'),
                    elmc = elm.querySelector('.likes_count');
                if(v.result==true){
                    elm.classList.add('active');
                    elmc&&(elmc.innerHTML = v.num);
                    elmTxt&&(elmTxt.innerHTML='取消赞');
                    // 这里可以记录一个时间,这样可以设置多久后又能点赞~
                    tagData[dataId] = true;
                    this.DB.setItem(tagName,tagData,function(){});
                }else if(!isNaN(v.num)){
                    elm.classList.remove('active');
                    elmc&&(elmc.innerHTML = v.num);
                    elmTxt&&(elmTxt.innerHTML='赞一个');
                    // 取消点赞就删掉记录
                    tagData[dataId] = false;
                    this.DB.setItem(tagName,tagData,function(){});
                }
                elm.removeAttribute('data-lock');
            }).catch(e=>{
                elm.removeAttribute('data-lock');
            });
        }

    }
    CustomElemtData = {};
    createElement(myelement, func,func2) {
        let N = this;
        class MyElement extends HTMLElement {
            CALLFUNC = func;
            CLOSEFUNC = func2;
            connectedCallback() {
              //一旦初始化后就会立即运行
                if(this.getAttribute('data-install'))return;
                this.setAttribute('data-install',true);
                this.CALLFUNC('connect', this);
            }
            disconnectedCallback() {
                this.CLOSEFUNC&&this.CLOSEFUNC('remove', this);
            }
        }
        window.customElements.define(myelement, MyElement);
    }
}
```
