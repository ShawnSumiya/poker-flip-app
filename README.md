# Poker Flip App

トランプカードをフリップ（表/裏）できる最小構成のWebアプリです。既存の`qualify-poker-app`のカードUIを流用しています。

## 起動

```bash
npm start
# ブラウザで http://localhost:3000 を開く
```

## 構成

- `index.html` アプリ本体（UIと操作ボタン）
- `cards.css` カードUIとフリップアニメーション
- `cards.js` カード生成/配布/一括フリップのロジック
- `package.json` 簡易サーバー起動用

## 操作
- 「カードを配る」: ランダムに数枚を伏せた状態で配置
- 「全てめくる/伏せる」: 盤面上のカードを一斉にフリップ
- カードをクリック: そのカードだけフリップ

## ライセンス
Copyright (C) 2025 D.D Poker Takadanobaba. All Rights Reserved.


