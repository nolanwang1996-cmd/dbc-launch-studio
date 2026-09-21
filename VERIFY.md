# VERIFY — DBC Launch Studio 链上流程验证

**验证时间**：2026-09-22 00:2x CST ｜ **验证人**：主控（人工执行 + 独立复核）
**环境**：⚠️ **本地验证器（solana-test-validator），非公共 devnet**（原因见文末）

## 执行结果（4/4 步全部 confirmed）

| 步骤 | 结果 | 交易签名 | 独立复核 |
|---|---|---|---|
| 1. createConfig | ✅ OK | `31HPw3CV1RxytWie8yRjozZgCZrZ2FWYQx7BoCKDsjSQXznQmBd3ifcq26g6WrwydRUs1Sh3wP7wGZNbapQDrC7U` | confirmed（Program 11111… success） |
| 2. createPool | ✅ OK | `5cDZAp9nZh2xgCUBy4C9CHzSw9VKqt4xpXX1qZ7M7jtQxgpnwKV1Ku22fjui2ogsQjuMDQC7qNfz1WwJKDHmZFZJ` | confirmed（Program 11111… success） |
| 3. buy 0.05 SOL | ✅ OK | `2kSrZcCYPZXA4u1NpzfYDFwQFsrvoUi26XfriByytnouFFu2DaEyC4pJfUgFBBKanQyA6GDPpvUVmZApPrQGwgCE` | confirmed（Tokenkeg… success） |
| 4. sell 50% | ✅ OK | `37rQyZVZgxCLrZAVb9oYr3WR7GRj3dAu49RERuvs8iErN4QQ3Vn8UrfRw9SARFwdbpb2MDPSJhBNkLY9qfQHcyfx` | confirmed（Tokenkeg… success） |

**链上对象**
- DBC program：`dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`
- config 账户：`2gByRvqusv1iBM397KFTARpoykUU8884PkhTvuW7Wid4`
- pool 账户：`7budf1PJZwvX9qpGioHTxZBAXammxXBU966HgFFrbKD2`
- base mint：`9tEfUMPPEjqZ8SQzMFftiPXHScABDocncFkxowHaNLuh`
- feeClaimer（agent 金库）：`7YhFp4RjxgcLm4MoCoTJWSB3R8vqC1WRsdPkejAWT1PG`

**池子读回状态**（步骤 5）
- quoteReserve = **0.024457 SOL**
- migrationQuoteThreshold = **9.2631 SOL**
- 迁移进度 = **0.26%**

## 复现步骤（任何人可跑）

```bash
export PATH="$HOME/.local/share/solana/install/active_release/bin:$PATH"

# 1) 起本地验证器并克隆 Meteora DBC 程序（可升级程序必须用 --clone-upgradeable-program）
solana-test-validator --url https://solana-rpc.publicnode.com \
  --clone-upgradeable-program dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN \
  --clone-upgradeable-program metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s \
  --rpc-port 8901 --reset

# 2) 本地领水（无限）
for k in creator partner trader; do
  solana airdrop 100 "$(solana-keygen pubkey .keys/$k.json)" --url http://127.0.0.1:8901
done

# 3) 跑全流程
DBC_RPC_URL=http://127.0.0.1:8901 npm run chain:flow

# 4) 复核任一笔
solana confirm -v <SIGNATURE> --url http://127.0.0.1:8901
```

## 过程中修复的两个真实缺陷（已提交进代码）

1. **`InvalidTokenSupply` (6020)** — `lib/studio.ts` 传给 `buildCurveWithMarketCap` 的参数不合法：
   - `leftover: 0` → **`leftover: 10000`**（供给校验要求 leftover 覆盖 swap buffer）
   - `migrationFeeOption: Customizable` + 自定义 fee + `migratedPoolFee` 块 → **`FixedBps100` + `{feePercentage: 0, creatorFeePercentage: 0}` 且移除 `migratedPoolFee`**（对齐官方 SDK 测试用例 `buildCurveWithMarketCap.test.ts` 的已知可用组合）
2. **`mint.toBuffer is not a function`** — `chain/run-flow.ts` 的 sell 路径把**字符串**传给了 `getAssociatedTokenAddressSync` / `client.pool.swap`：
   - 改为 `new PublicKey(baseMintAddress)` / `new PublicKey(poolAddress)`

## 为什么用本地验证器而不是公共 devnet（如实说明）

- 本机在中国大陆：`api.devnet.solana.com` **直连被墙**；经本机代理（`127.0.0.1:8892`）可读写
- **devnet SOL 当前无法获取**（2026-09-22 实测）：官方 `requestAirdrop` 经 **4 个不同出口 IP（us-dc / us-res×2 / sg）全部返回 429 "faucet has run dry"**（全球性干涸，非 IP 限流）；官方网页 faucet 需 GitHub 登录且同池；PoW 水龙头（`devnet-pow`）有余额的池子因**新钱包无 SOL 付领取手续费**而失败
- 因此选择**本地验证器 + 克隆真实 DBC 程序**：执行的是**与主网相同的程序二进制**（可升级程序克隆），交易签名可用 `solana confirm -v` 独立复核
- **待办**：一旦 devnet SOL 可得（faucet 恢复 / 其他来源），把同一 `chain:flow` 指向 `DBC_RPC_URL=https://api.devnet.solana.com`（配代理）重跑一次，即可产出**公共 devnet 的 explorer 链接**用于提交材料

## 真实性声明

- 上述 4 笔签名均为**真实交易**（本地验证器链上），已用 `solana confirm -v` 逐笔复核为 `confirmed`
- **不等同于**公共 devnet / 主网上的交易；`explorer.solana.com` 链接为脚本按 devnet 集群格式生成，**本地验证器的签名在公共浏览器上不可查**
- 池子状态数字（quoteReserve / threshold / 进度）来自 `client.state.getPool` / `getPoolConfig` 实读
