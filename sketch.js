let video;
let hands;
let predictions = [];
let playerGesture = "等待中...";
let computerGesture = "";
let resultMessage = "比出 👍 開始，👎 結束遊戲";
let lastResetTime = 0;
let imgRock, imgPaper, imgScissors;
let computerImg;
let winCount = 0;
let lossCount = 0;
let tieCount = 0;
let isProcessing = false; // 防止重複發送影格
let countdownText = "";
let gameState = "START_MENU"; // START_MENU, WAITING, COUNTDOWN, RESULT, CONFIRM_EXIT
let startButtonActive = false;
let confirmButtonActive = false;
let cancelButtonActive = false;
let particles = []; // 儲存彩帶粒子

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
    
    // 根據手勢切換狀態
    if (playerGesture === "開始 (Start)" && gameState === "WAITING") {
      gameState = "COUNTDOWN";
      lastResetTime = millis();
    } else if (playerGesture === "結束 (End)" && (gameState === "WAITING" || gameState === "RESULT")) {
      // 只在等待或結果畫面時，比出倒讚才跳轉至確認介面，避免倒數中誤觸
      gameState = "CONFIRM_EXIT";
    }

    // 遊戲流程邏輯
    if (gameState === "COUNTDOWN") {
      let elapsed = millis() - lastResetTime;
      if (elapsed < 3000) {
        countdownText = Math.ceil(3 - elapsed / 1000);
        resultMessage = "準備出拳...";
      } else {
        playGame(); // 3秒到，判定勝負
        gameState = "RESULT";
        countdownText = "";
        lastResetTime = millis(); // 記錄結果顯示的開始時間
      }
    } else if (gameState === "RESULT") {
      // 結果顯示 2 秒後回到等待狀態
      if (millis() - lastResetTime > 2000) {
        gameState = "WAITING";
        resultMessage = "比出 👍 挑戰，或 👎 結束";
      }
    }
  } else {
    playerGesture = "未偵測到手部";
  }
}

function draw() {
  if (gameState === "START_MENU") {
    drawStartMenu();
    return;
  }

  if (gameState === "CONFIRM_EXIT") {
    drawConfirmExit();
    return;
  }

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

  // 繪製大大的倒數計時文字
  if (countdownText !== "") {
    textSize(150);
    fill(255, 0, 0); // 紅色倒數
    textAlign(CENTER, CENTER);
    text(countdownText, width / 2, height / 2);
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

  // 加入倒讚結束遊戲的提示詞
  if (gameState === "WAITING") {
    fill(255, 200); // 半透明白色
    textSize(20);
    text("提示：比出倒讚 👎 即可結束遊戲並歸零分數", width / 2, height - 90);
  }

  textAlign(LEFT);

  // 繪製與更新彩帶慶祝動畫
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].display();
    if (particles[i].y > height) {
      particles.splice(i, 1); // 掉出畫面後移除，節省效能
    }
  }
}

function drawStartMenu() {
  background(34); // 深色背景
  fill(255);
  textAlign(CENTER, CENTER);
  
  // 標題
  textSize(60);
  text("手勢猜拳大對決", width / 2, height / 2 - 80);
  
  // 按鈕繪製
  let buttonX = width / 2;
  let buttonY = height / 2 + 50;
  let buttonW = 240;
  let buttonH = 70;
  let buttonRadius = 15;

  let mouseOverStartButton = mouseX > buttonX - buttonW / 2 && mouseX < buttonX + buttonW / 2 &&
                             mouseY > buttonY - buttonH / 2 && mouseY < buttonY + buttonH / 2;

  push();
  translate(buttonX, buttonY);
  if (mouseOverStartButton && mouseIsPressed) {
    scale(0.95); // Slight scale down
  }
  
  fill(0, 180, 0);
  rectMode(CENTER);
  rect(0, 0, buttonW, buttonH, buttonRadius); // Draw relative to translated origin
  fill(255);
  textSize(32);
  text("開始遊戲", 0, 0); // Draw relative to translated origin
  pop(); // Restore transformations
}

function drawConfirmExit() {
  background(34); // 深色背景
  fill(255);
  textAlign(CENTER, CENTER);
  
  // 詢問文字
  textSize(40);
  text("確定要結束遊戲嗎？", width / 2, height / 2 - 50);
  
  // "確定" 按鈕
  let confirmButtonX = width / 2 - 100;
  let confirmButtonY = height / 2 + 50;
  let confirmButtonW = 120;
  let confirmButtonH = 60;
  let confirmButtonRadius = 10;

  let mouseOverConfirmButton = mouseX > confirmButtonX - confirmButtonW / 2 && mouseX < confirmButtonX + confirmButtonW / 2 &&
                               mouseY > confirmButtonY - confirmButtonH / 2 && mouseY < confirmButtonY + confirmButtonH / 2;

  push();
  translate(confirmButtonX, confirmButtonY);
  if (mouseOverConfirmButton && mouseIsPressed) {
    scale(0.95);
  }

  rectMode(CENTER);
  fill(200, 50, 50); // 紅色
  rect(0, 0, confirmButtonW, confirmButtonH, confirmButtonRadius);
  fill(255);
  textSize(24);
  text("確定", 0, 0);
  pop();

  // 「取消」按鈕
  let cancelButtonX = width / 2 + 100;
  let cancelButtonY = height / 2 + 50;
  let cancelButtonW = 120;
  let cancelButtonH = 60;
  let cancelButtonRadius = 10;

  let mouseOverCancelButton = mouseX > cancelButtonX - cancelButtonW / 2 && mouseX < cancelButtonX + cancelButtonW / 2 &&
                              mouseY > cancelButtonY - cancelButtonH / 2 && mouseY < cancelButtonY + cancelButtonH / 2;

  push();
  translate(cancelButtonX, cancelButtonY);
  if (mouseOverCancelButton && mouseIsPressed) {
    scale(0.95);
  }

  fill(100); // 灰色
  rect(width / 2 + 100, height / 2 + 50, 120, 60, 10);
  fill(255);
  text("取消", width / 2 + 100, height / 2 + 50);
  rectMode(CORNER);
}

function resetGame() {
  winCount = 0; lossCount = 0; tieCount = 0;
  gameState = "START_MENU";
  resultMessage = "比出 👍 開始，👎 結束遊戲";
  computerImg = null;
  countdownText = "";
  particles = [];
}

function mousePressed() {
  if (gameState === "START_MENU") {
    // 檢查點擊座標是否在「開始遊戲」按鈕內
    let buttonX = width / 2;
    let buttonY = height / 2 + 50;
    let buttonW = 240;
    let buttonH = 70;
    if (mouseX > buttonX - buttonW / 2 && mouseX < buttonX + buttonW / 2 &&
        mouseY > buttonY - buttonH / 2 && mouseY < buttonY + buttonH / 2) {
      gameState = "WAITING";
      resultMessage = "請對著鏡頭比出 👍 開始對決！"; // 點擊後立即更新提示
    }
  } else if (gameState === "CONFIRM_EXIT") {
    // 檢查「確定」按鈕
    let btnW = 120, btnH = 60;
    if (mouseX > width / 2 - 100 - btnW / 2 && mouseX < width / 2 - 100 + btnW / 2 &&
        mouseY > height / 2 + 50 - btnH / 2 && mouseY < height / 2 + 50 + btnH / 2) {
      // 確定離開：重設所有分數與狀態並返回主選單
      resetGame();
    }
    // 檢查「取消」按鈕
    if (mouseX > width / 2 + 100 - btnW / 2 && mouseX < width / 2 + 100 + btnW / 2 &&
        mouseY > height / 2 + 50 - btnH / 2 && mouseY < height / 2 + 50 + btnH / 2) {
      gameState = "WAITING";
    }
  }
}

function detectGesture(landmarks) {
  // 判斷手指是否伸直 (y 座標越小代表越高)
  const isOpen = (tip, mcp) => landmarks[tip].y < landmarks[mcp].y;

  const indexOpen = isOpen(8, 5);
  const middleOpen = isOpen(12, 9);
  const ringOpen = isOpen(16, 13);
  const pinkyOpen = isOpen(20, 17);
  
  // 大拇指狀態 (用拇指尖 4 與關節 3 的 Y 座標比較)
  const thumbUp = landmarks[4].y < landmarks[3].y;
  const thumbDown = landmarks[4].y > landmarks[3].y;

  // 檢查是否為「讚」(Thumbs Up) -> 開始
  if (thumbUp && !indexOpen && !middleOpen && !ringOpen && !pinkyOpen) return "開始 (Start)";
  // 檢查是否為「倒讚」(Thumbs Down) -> 結束/重置
  if (thumbDown && !indexOpen && !middleOpen && !ringOpen && !pinkyOpen) return "結束 (End)";

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
    // 產生彩帶粒子
    for (let i = 0; i < 150; i++) {
      particles.push(new Confetti());
    }
  } else {
    resultMessage = "你輸了！";
    lossCount++;
  }
}

// 彩帶粒子類別
class Confetti {
  constructor() {
    this.x = random(width);
    this.y = random(-height, 0); // 從上方隨機位置掉落
    this.size = random(5, 15);
    this.color = color(random(255), random(255), random(255));
    this.speedX = random(-2, 2);
    this.speedY = random(3, 8); // 掉落速度
    this.rotation = random(TWO_PI);
    this.rotSpeed = random(-0.1, 0.1);
  }
  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    this.rotation += this.rotSpeed;
  }
  display() {
    fill(this.color);
    noStroke();
    push();
    translate(this.x, this.y);
    rotate(this.rotation);
    rectMode(CENTER);
    rect(0, 0, this.size, this.size / 2);
    pop();
  }
}
