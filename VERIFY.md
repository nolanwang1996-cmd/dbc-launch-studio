# VERIFY — DBC Launch Studio 链上流程验证

**更新**：2026-09-22 01:5x CST ｜ 本文件区分三类证据：**主网（最强证据，含第三方真实买入）**、**公共 devnet**、**本地验证器（离线复现路径）**。

---

## 〇、Solana 主网（最强证据，explorer 可查）

执行时间：2026-09-22 01:3x–01:5x CST ｜ RPC：`https://solana-rpc.publicnode.com`（direct）
资金来源：Phantom 测试钱包（`4yAbyMVFnhe92EMp81UiU3ZxALCKXToeDNjEan6vBxRq`）内 5 USDC 无 gas 兑换为 0.042 SOL，分发：creator `5zCYCunaeCzMzQUquex9pZyNq3c2vtLsD2mChzP4d5HhPuEq7dQEHhcd8U6hzbdpCzGBguALLHXYNd9Tq1EH8WfV` / trader `5mFgatka1JQkjWs85VjahvVRJqLNgHR97KQSBQ3kGfAfsMPsGJ1uH3gAzxhMUp9RJsF8M1Z7tU3VqKcfREYGSr3x`。

**代币：Agent Compute Credit (AGTC) — 主网**

| 项 | 值 |
|---|---|
| mint | `2KYxjNxqUgpxTbpwFQMxXT6QbRJ8v8N63LC4Gb2SQnU7` |
| pool | `51behYte9RzbqGKTz1CxMg6Q79GYhZC44YGeMcUDi7cH` |
| config | `4SUrwSMfiFCbvNGYUZ2h218yf5iyRg6TSErjAt7WNYk5` |
| feeClaimer（agent 金库） | `7YhFp4RjxgcLm4MoCoTJWSB3R8vqC1WRsdPkejAWT1PG` |

| 步骤 | 交易签名 | slot |
|---|---|---|
| createConfig | `5avVJSsXFXpVzsEGRd7oWtXQretVPWkHyhKnWrXUTRt4p6DndF3sow6UvNnRrohuyP7ubte8C56r4NMTqfKhguV2` | 449128590 |
| createPool | `3SnXuqbS1EKhiwUSTTpykCpEaAfbc9r7kWq27D9CZtnGHr4cbnp9W7Vkvb45giCUUibz8YkE36kntmqcMam6jBzV` | 449128608 |
| buy 0.002 SOL | `3QUxHuwcU1xwkViNDDVMkqVFTjB9XF8CiH3kG4WRgNhg6W5ey4UYLykgJWmAMT11mz5zQAFcSshT5sxeAPd5ZHcL` | 449129259 |
| sell 50% | `gFMkKxXMxGSiDPAtCCB5U8JxMdYF3jJTeJNpfHHBkeJKYBZhWsJ4iTcfiN4XK7S1zM4whr5AX6KT4q8vLNtfGww` | 449129466 |

**🔥 第三方真实买入（非我方钱包，发射后 ~1 分钟内）**——判据"链上真实使用/成交量"的直接证据：

| 买方（外部钱包） | 交易签名 | slot | 净投入 |
|---|---|---|---|
| `2X3EarLXkRwQ1FCGVcSoCRpNipFQ3fBiRNKM7K9PT6Rv` | `2NdzdJewFUzswvB6bukCSXLuhf2n6FNAneiG4gc9tJARn3sCUqsVfKWCQBse19ojcQzM8Gc1Jt742RiYtN2Yeh2G` | 449128623 | 0.1035 SOL |
| `9xqDhDPqMJXQwKDuKfPo1UYiMRE2pFYnMS7LFU7KSQ1Z` | `61ibRb1oPT9anQoMCP9giSupVdo8YZkqwaS2Xko1r1cfrhs4eVsVqWBPKBFGB2soLtSEYdDbtHagMZDHFEvD2FSV` | 449128674 | 0.0617 SOL |

池子读回（主网）：quoteReserve `0.155054` SOL / 阈值 `9.263132695` SOL / 迁移进度 `1.67%` / baseReserve 927,877,910 AGTC。
Explorer：`https://explorer.solana.com/tx/<签名>`（主网无需 cluster 参数）。

---

## 一、公共 Solana devnet（explorer 可查）

执行时间：2026-09-22 00:2x–00:4x CST ｜ RPC：`https://api.devnet.solana.com`
（genesis `EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG`，SDK `@meteora-ag/dynamic-bonding-curve-sdk@1.5.12`）

### CLI 全流程（AGTC — "Agent Compute Credit"）

| 步骤 | 交易签名 | slot | 状态 |
|---|---|---|---|
| createConfig | `4VvCjtDnpHKuQes2AzGsy2ZvLWGFxhrdyGQAgTTFiytgMMh2eV7wwrebMCGBBoNqUWHn9FBLtb5R3B5RFUiR5Mth` | 501985851 | err: null |
| createPool | `57YZMvaQB9UYL9ch2uhZhJqzyNK9sQ4gUkzqvUgvDzpfHVW7Fynbphfrjx8dDdMpQkCydgFQVXtHLQUBidccVXgD` | 501985878 | err: null |
| buy 0.05 SOL → 24,171,585.73 AGTC | `24s1UHrftW8wfr1yE5GkCy7tRvkP7m8PZ2nUgdGKYzoT6aSffxgcduREbbZ3QmDCLjDbcSZ6VFigbndhevqNR6Lw` | 501986050 | err: null |
| sell 12,085,792.86 AGTC → SOL | `5wp61jYAMM94ckj9HjavnyqYj8e7UgQGR8kZT7t2ajsTBW77fVf99Eop4jiDEXioPtLEKxQUs1hJc81MGe9Vqg3H` | 501986412 | err: null |

链上对象：config `CdUmkBrA8s9JUMqg3vm6wYfhTXMSB3pP7dTnLXhnvK7p` ｜ pool `GzRDmC7P2evninsmpfZKcMHucpXqGE5CVqRaD3Kap3sS` ｜ mint `DUPGwtkUyrQW6Piv5UdSTERW6KPWCnQTZT9f9aMN9jNX` ｜ **feeClaimer（agent 金库）`7YhFp4RjxgcLm4MoCoTJWSB3R8vqC1WRsdPkejAWT1PG`**（经 `getPoolConfig` 链上核实）

池子读回：quoteReserve `0.024457324` SOL / migrationThreshold `9.263132695` SOL / 进度 `0.264%` ｜ 费用累计（链上）：partner(金库) `0.000302484` SOL、creator `0.000302483` SOL、protocol `0.00015124` SOL

### 前端一键发币（演示视频中真实发生）

| 代币 | 步骤 | 签名 | slot |
|---|---|---|---|
| AGTC2 | createConfig | `39vM54fDV5gzodTMigPypgA3X8fb3GsHVCgH7gn225LRUhTdxTfWewCVenrLwRJDBuB6ibimqdZLUe3x4U1iszFv` | 501991198 |
| AGTC2 | createPool（pool `D7wJozMUQrXC5hVqhdjJCkyDQT24EyH4KmxNq5tL4T3p`） | `MfurZzrsq2sp5deoJyt8LC4UiafzaiZdkcT16zXMucHRd5j1HBt1CoVeKubyfNq6Q7Z1USFu5m6wudFE8xFgw94` | 501991225 |
| AGTC3 | createConfig | `5SrP8n28oMHhfZQTfz9iRKM8uQZN4h2wpKLdJ5HK1W7uuvTTb3AY59CgNg4GkXGsWwrPH5CjwNuuhLYQ3awmNYCc` | 501993606 |
| AGTC3 | createPool（pool `72hqXyaeMAmKb98XS5qo2EyZHGgBqVDxKsDBX6bKnxDY`，演示视频中的那次 launch） | `3YcghbvQ2vKMkGZoB8zrTdTizC1Ej3Jq4s1noLMZij4CW8rrAvv7zoGyjYWURQ6iagnoc69aavLgWnCpd1vYCAc7` | 501993633 |

Explorer 链接格式：`https://explorer.solana.com/tx/<签名>?cluster=devnet`

### 复现验证（只读，无需任何密钥）

```bash
npm install
npm run chain:verify    # 逐笔 getTransaction 复核上述签名，期望 "ALL VERIFIED ON-CHAIN ✔"
npm run chain:status    # 实读池子 reserves / 迁移进度 / 费用
```

curl 等价验证：

```bash
curl -X POST https://api.devnet.solana.com -H 'content-type: application/json' -d '{
  "jsonrpc":"2.0","id":1,"method":"getTransaction",
  "params":["24s1UHrftW8wfr1yE5GkCy7tRvkP7m8PZ2nUgdGKYzoT6aSffxgcduREbbZ3QmDCLjDbcSZ6VFigbndhevqNR6Lw",
            {"maxSupportedTransactionVersion":0,"commitment":"confirmed"}]}'
# 期望 meta.err == null，指令含 DBC 程序 dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN
```

**devnet SOL 来源（如实说明）**：官方 `requestAirdrop` 当时全局 429（faucet 干涸），最终经 `faucet.solana.com` 的 GitHub OAuth 通道 drip 成功（2×5 SOL，partner/creator），trader 由 partner 转账 2 SOL（tx `88FSqhsLJUqrGfjKfkeGPLKibjxKi6ZYp1szqNx1C5kWkYjcPRzghabutd73XViEvf7cPZVyf7PigDmFp4QZZse`）。

---

## 二、本地验证器（离线复现路径，非公共链）

执行时间：2026-09-22 00:2x CST ｜ 环境：`solana-test-validator`（端口 8901），用 `--clone-upgradeable-program` 克隆**真实 DBC 程序二进制**（与主网相同）+ Metaplex。

| 步骤 | 交易签名（本地链） | 复核 |
|---|---|---|
| createConfig | `31HPw3CV1RxytWie8yRjozZgCZrZ2FWYQx7BoCKDsjSQXznQmBd3ifcq26g6WrwydRUs1Sh3wP7wGZNbapQDrC7U` | `solana confirm -v` confirmed |
| createPool | `5cDZAp9nZh2xgCUBy4C9CHzSw9VKqt4xpXX1qZ7M7jtQxgpnwKV1Ku22fjui2ogsQjuMDQC7qNfz1WwJKDHmZFZJ` | confirmed |
| buy 0.05 SOL | `2kSrZcCYPZXA4u1NpzfYDFwQFsrvoUi26XfriByytnouFFu2DaEyC4pJfUgFBBKanQyA6GDPpvUVmZApPrQGwgCE` | confirmed |
| sell 50% | `37rQyZVZgxCLrZAVb9oYr3WR7GRj3dAu49RERuvs8iErN4QQ3Vn8UrfRw9SARFwdbpb2MDPSJhBNkLY9qfQHcyfx` | confirmed |

⚠️ 这些签名存在于**本地验证器**（validator 停止后即不可查），**不在公共 devnet**，explorer.solana.com 查不到——仅作为无网络/无 SOL 环境下的离线复现路径，不作为提交主证据。

### 本地复现步骤

```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"
solana-test-validator --url https://solana-rpc.publicnode.com \
  --clone-upgradeable-program dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN \
  --clone-upgradeable-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s \
  --rpc-port 8901 --reset
for k in creator partner trader; do
  solana airdrop 100 "$(solana-keygen pubkey .keys/$k.json)" --url http://127.0.0.1:8901
done
DBC_RPC_URL=http://127.0.0.1:8901 npm run chain:flow
```

### 过程中修复的两个真实缺陷（已提交进代码）

1. **`InvalidTokenSupply` (6020)** — `leftover: 0 → 10000`；`migrationFeeOption` 改 `FixedBps100` + fee 全 0 并移除 `migratedPoolFee` 块（对齐官方 SDK 测试的已知可用组合）
2. **`mint.toBuffer is not a function`** — sell 路径的字符串地址改为 `new PublicKey(...)`

---

## 三、RPC Fast 端点实测（mainnet 只读，2026-09-22）

RPC Fast 免费档账号已注册（Solana dashboard，计划：15 req/s / 1.5M CU，**mainnet only**）。
端点通过 `DBC_RPC_URL` 环境变量缝接入（`chain/env.ts`），实测脚本 `chain/rpc-check.ts`：

```bash
DBC_RPC_URL="https://solana-rpc.rpcfast.com/?api_key=<key>" npx tsx chain/rpc-check.ts
```

实测输出（2026-09-22 01:5x CST，中国大陆直连，无代理；key 已脱敏）：

```
RPC check — endpoint: https://solana-rpc.rpcfast.com/?api_key=wj3pRE…fa15
  detected network label: mainnet
  getVersion: 891ms (solana-core 4.3.0-rc.1)
  getBalance(treasury 7YhFp4…T1PG): 959ms → 0 lamports @ slot 449127988
  getLatestBlockhash: 279ms @ slot 449127988
RPC check OK
```

说明：免费档为 mainnet-only，因此发射流程（devnet）不走 RPC Fast；接入价值在
mainnet 阶段的池子状态轮询（getPool/getPoolConfig）与低延迟 swap 上送。
API key 仅存本地 `.env`（`.gitignore` 覆盖），不在本仓库。

---

## 四、Panta API 集成实测（2026-09-22）

自助注册 Panta API 账号（email + password，`/auth/register/` → `/account/keys/` 铸造 `pk_test_` key），
真实客户端 `lib/panta.ts` + 检查脚本 `chain/panta-check.ts`：

```bash
PANTA_API_KEY=pk_test_… npx tsx chain/panta-check.ts
```

实测输出（2026-09-22 02:0x CST）：

```
Panta integration check
  whoami: DBC Launch Studio <nolanwang2026@gmail.com> status=active canCreateMarkets=true
  markets: 1 listed (first: "Sandbox test market")
  quote: createId=cr_sandbox_test fee=50 USDC (liquidity 10 + platform 40)
  note: Test mode: this response uses sandbox fixtures and does not access Solana mainnet.
Panta integration check OK
```

集成的市场条件直接引用我们已验证的 DBC 池状态：「池 GzRDmC7P… 是否在创建后 7 天内达到
migrationQuoteThreshold」——结算依据是**客观链上状态（quoteReserve ≥ migrationQuoteThreshold），
非人工裁决**；创建费报价 50 USDC（10 流动性注入 + 40 平台收入）。

如实标注：`pk_test_` key 返回 sandbox fixtures（不触 mainnet）；`pk_live_` 升级路径相同
（`/account/keys/` 铸 `env=live`），需要真实 USDC 创建费时再做（**需要用户决策**：50 USDC/市场）。
API key 仅存本地 `.env`（`.gitignore` 覆盖），不在本仓库。

---

## 真实性声明

- 第一部分 8 笔签名为**公共 devnet 真实交易**，可用上文命令独立复核（`meta.err == null`）
- 第二部分 4 笔签名为**本地验证器**真实交易，与公共链明确区分，不混入提交主证据
- 池子状态数字均来自 `client.state.getPool` / `getPoolConfig` 实读，无 mock
- 主网发币待主钱包有 SOL gas 后进行（当前余额 0），不阻塞本交付
