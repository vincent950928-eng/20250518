let video;
let hands;
let predictions = [];
let playerGesture = "等待中...";
let computerGesture = "";
let resultMessage = "請比出手勢！";
let lastResetTime = 0;
let imgRock, imgPaper, imgScissors;
let computerImg;
let winCount = 0;
let lossCount = 0;
let tieCount = 0;
let isProcessing = false; // 防止重複發送影格

function preload() {
  // 請確保你的資料夾中確實有這些圖片檔案
  // 使用網路上的 Emoji 圖片作為預設，解決 404 錯誤
  imgRock = loadImage('https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/128/emoji_u270a.png');
  imgPaper = loadImage('https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/128/emoji_u270b.png');
  imgScissors = loadImage('https://raw.githubusercontent.com/googlefonts/noto-emoji/main/png/128/emoji_u270c.png');
}

function setup() {
  createCanvas(800, 600); // 放大畫布尺寸
  
  // 初始化攝影機
  video = createCapture(VIDEO, (stream) => {
    console.log("攝影機啟動成功");
  }, (err) => {
    resultMessage = "錯誤：找不到攝影機！";
    console.error(err);
  });
  video.size(800, 600);
  video.hide();

  // 初始化 MediaPipe Hands
  hands = new Hands({
    locateFile: (file) => {
      return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5
  });

  hands.onResults(onResults);
}

function onResults(results) {
  isProcessing = false; // 處理完畢，開放下一影格
  predictions = results.multiHandLandmarks;
  if (predictions && predictions.length > 0) {
    playerGesture = detectGesture(predictions[0]);
    
    // 簡單的遊戲邏輯：每隔 3 秒隨機更新一次電腦出拳
    if (millis() - lastResetTime > 3000) {
      playGame();
      lastResetTime = millis();
    }
  } else {
    playerGesture = "未偵測到手部";
  }
}

function draw() {
  // 手動控制影格發送給 MediaPipe，避免使用 Camera 物件造成的衝突
  if (video.elt.readyState === 4 && !isProcessing) {
    isProcessing = true;
    hands.send({ image: video.elt });
  }

  translate(width, 0);
  scale(-1, 1); // 鏡像處理，讓操作更直覺
  image(video, 0, 0, width, height);
  
  // 繪製手部關節點
  if (predictions && predictions.length > 0) {
    for (let landmarks of predictions) {
      // 定義骨架連接順序
      const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4],       // 大拇指
        [0, 5], [5, 6], [6, 7], [7, 8],       // 食指
        [5, 9], [9, 10], [10, 11], [11, 12],  // 中指
        [9, 13], [13, 14], [14, 15], [15, 16],// 無名指
        [13, 17], [17, 18], [18, 19], [19, 20],// 小指
        [0, 17]                               // 手掌底部
      ];

      // 畫線 (骨架)
      stroke(255, 200); // 半透明白色
      strokeWeight(3);
      for (let conn of connections) {
        let p1 = landmarks[conn[0]];
        let p2 = landmarks[conn[1]];
        line(p1.x * width, p1.y * height, p2.x * width, p2.y * height);
      }

      // 畫點 (關節)
      for (let point of landmarks) {
        fill(0, 255, 0); // 綠色關節點
        noStroke();
        ellipse(point.x * width, point.y * height, 10, 10);
      }
    }
  }

  // 復原座標系以繪製文字
  translate(width, 0);
  scale(-1, 1);

  // 顯示資訊介面
  fill(0, 150);
  rect(20, 20, 280, 140, 15); // 稍微放大資訊框
  fill(255);
  textSize(28);
  text(`玩家: ${playerGesture}`, 40, 60);
  text(`電腦: `, 40, 115);
  
  // 繪製電腦的出拳圖片
  if (computerImg) {
    // 配合文字放大圖片
    image(computerImg, 120, 80, 70, 70);
  }

  // 顯示計分板 (畫面最下方)
  fill(0, 100);
  rect(0, height - 30, width, 30);
  fill(255);
  textSize(18);
  textAlign(CENTER);
  text(`勝: ${winCount}  |  敗: ${lossCount}  |  平手: ${tieCount}`, width / 2, height - 10);
  
  textSize(32);
  fill(255, 255, 0);
  textAlign(CENTER);
  text(resultMessage, width / 2, height - 50);
  textAlign(LEFT);
}

function detectGesture(landmarks) {
  // 判斷手指是否伸直 (y 座標越小代表越高)
  const isOpen = (tip, mcp) => landmarks[tip].y < landmarks[mcp].y;

  const indexOpen = isOpen(8, 5);
  const middleOpen = isOpen(12, 9);
  const ringOpen = isOpen(16, 13);
  const pinkyOpen = isOpen(20, 17);

  if (indexOpen && middleOpen && ringOpen && pinkyOpen) return "布 (Paper)";
  if (indexOpen && middleOpen && !ringOpen && !pinkyOpen) return "剪刀 (Scissors)";
  if (!indexOpen && !middleOpen && !ringOpen && !pinkyOpen) return "石頭 (Rock)";
  
  return "偵測中...";
}

function playGame() {
  // 檢查玩家手勢是否有效，避免在未偵測到手部時計入分數
  if (playerGesture === "偵測中..." || playerGesture === "未偵測到手部") {
    resultMessage = "請準備好出拳！";
    return;
  }

  const choices = ["石頭 (Rock)", "剪刀 (Scissors)", "布 (Paper)"];
  computerGesture = random(choices);

  // 根據隨機結果設定對應的圖片
  if (computerGesture === "石頭 (Rock)") {
    computerImg = imgRock;
  } else if (computerGesture === "剪刀 (Scissors)") {
    computerImg = imgScissors;
  } else if (computerGesture === "布 (Paper)") {
    computerImg = imgPaper;
  }

  if (playerGesture.includes(computerGesture.split(" ")[0])) {
    resultMessage = "平手！";
    tieCount++;
  } else if (
    (playerGesture.includes("石頭") && computerGesture.includes("剪刀")) ||
    (playerGesture.includes("剪刀") && computerGesture.includes("布")) ||
    (playerGesture.includes("布") && computerGesture.includes("石頭"))
  ) {
    resultMessage = "你贏了！";
    winCount++;
  } else {
    resultMessage = "你輸了！";
    lossCount++;
  }
}
