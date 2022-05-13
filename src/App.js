import './App.css';
import { useState, useEffect } from "react";
import axios from "axios";
import { utils,ethers} from "ethers";
import { ComposedChart,
  ResponsiveContainer,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  Scatter
} from "recharts";
//import collectionInfo from "./nft-info.js"

const contractAddress = "0x59468516a8259058baD1cA5F8f4BFF190d30E066";
const apiKey = "demo";
const provider = new ethers.providers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/${apiKey}/`);

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="label"> &nbsp; {`Avg Price: Ξ ${payload[1].value}`} &nbsp;</p>
        <p className="label"> &nbsp; {`Volume: Ξ ${payload[2].value}`} &nbsp;</p>
        <p className="label"> &nbsp; {`Num Sales: ${payload[0].value}`} &nbsp;</p>
      </div>
    );
  }

  return null;
};

function App() {
  const [contractName, setContractName] = useState({});
  const [contractSupply, setContractSupply] = useState({});
  const [contractSample, setContractSample] = useState({});
  const [priceVolume, setPriceVolume] = useState({});
  const [chartData, setChartData] = useState({});
  const [isPriceVolLoading, setPriceVolLoading] = useState(true);
  const [isContractLoading, setContractLoading] = useState(true);
  const [isSampleLoading, setSampleLoading] = useState(true);

  const getContractInfo = async () => {
    const nftMetadataURL = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}/getContractMetadata/?contractAddress=${contractAddress}`;
    const response = await axios.get(nftMetadataURL);

    setContractName(response.data.name);
    setContractSupply(response.data.contractMetadata.totalSupply);
    setContractLoading(false);
  };

  const getContractSample = async () => {

    const nftMetadataURL = `https://eth-mainnet.g.alchemy.com/v2/${apiKey}/getNFTsForCollection/?contractAddress=${contractAddress}&withMetadata=true`;
    const response = await axios.get(nftMetadataURL);

    setContractSample(
      [response.data.nfts[0].media[0].gateway,
      response.data.nfts[1].media[0].gateway,
      response.data.nfts[2].media[0].gateway,
      response.data.nfts[3].media[0].gateway,
      response.data.nfts[4].media[0].gateway,
    ])
    setSampleLoading(false);
  };

  const getPriceVolume = async () => {

    // Exchange Info
    const openSeaWyvernExchangev2 = "0x7f268357A8c2552623316e2562D90e642bB538E5";
    const looksRareExchange = "0x59728544B08AB483533076417FbBB2fD0B17CE3a";
    const wETHaddress = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

    // Batch size = number of extra queries needed per NFT transfer
    const logBatch = 1000;
    const offset = 9000;
    const batchSize = 30;
    var logBatches = [];
    var swapAgInfo = {};
    var swapData = [];
    var lastPriceList = [];

    const provider = new ethers.providers.JsonRpcProvider(`https://eth-mainnet.g.alchemy.com/v2/demo/`);

    //const web3 = new Web3("https://eth-mainnet.alchemyapi.io/v2/9bQ2tKDlFxvEjLPgDkbqxflxEAuUOfEu");

    const axiosURL = "https://eth-mainnet.alchemyapi.io/v2/9bQ2tKDlFxvEjLPgDkbqxflxEAuUOfEu";

    const blockNumBody = {
      "jsonrpc":"2.0",
      "method":"eth_blockNumber",
      "params":[],
      "id":0
    }

    var block = await axios.post(axiosURL, blockNumBody)
    var block = parseInt(block.data.result,16)
    const blockOffset = block-offset;

    let transfersBody = JSON.stringify({
      "jsonrpc": "2.0",
      "id": 0,
      "method": "alchemy_getAssetTransfers",
      "params": [
        {
          "fromBlock": "0x"+blockOffset.toString(16),
          "contractAddresses": [contractAddress],
          "excludeZeroValue": true,
          "category": ["erc721"]
        }
      ]
    });

    var rawContractTxs = await axios.post(axiosURL, transfersBody)

    var rawTxs = new Set();
    for (const tx of rawContractTxs.data.result.transfers) {
        // If NFT is ERC721
        if (tx.erc1155Metadata == null)  {
          rawTxs.add(tx.hash);
        }
        else{
          // Ignoring ERC1155 NFTs
        }
    }

    for (var i=9000; i>=0; i-=logBatch) {

      // Backcalculating blocks
      const blockOffsetTo = (block-i+logBatch);
      const blockOffsetFrom = (block-i);

      let openSeaBody = JSON.stringify({
        "jsonrpc":"2.0",
        "id": 1,
        "method":"eth_getLogs",
        "params": [{
          "fromBlock": "0x"+blockOffsetFrom.toString(16),
          "toBlock": "0x"+blockOffsetTo.toString(16),
          "address": openSeaWyvernExchangev2,
          "topics": ["0xc4109843e0b7d514e4c093114b863f8e7d8d9a458c372cd51bfe526b588006c9"]
         }]
      });

      let looksRareBodyAsk = JSON.stringify({
        "jsonrpc":"2.0",
        "id": 1,
        "method":"eth_getLogs",
        "params": [{
          "fromBlock": "0x"+blockOffsetFrom.toString(16),
          "toBlock": "0x"+blockOffsetTo.toString(16),
          "address": looksRareExchange,
          "topics": ["0x68cd251d4d267c6e2034ff0088b990352b97b2002c0476587d0c4da889c11330"]
        }]
      });

      let looksRareBodyBid = JSON.stringify({
        "jsonrpc":"2.0",
        "id": 1,
        "method":"eth_getLogs",
        "params": [{
          "fromBlock": "0x"+blockOffsetFrom.toString(16),
          "toBlock": "0x"+blockOffsetTo.toString(16),
          "address": looksRareExchange,
          "topics": ["0x95fb6205e23ff6bda16a2d1dba56b9ad7c783f67c96fa149785052f47696f2be"]
        }]
      });

      logBatches.push(openSeaBody)
      logBatches.push(looksRareBodyAsk)
      logBatches.push(looksRareBodyBid)

    }

    for (var i=0; i<logBatches.length; i+=batchSize) {

      //console.log('-- Sending Batch --')
      const queryParams = logBatches.slice(i,i+batchSize);

      // Wrapping batch queries in promises for smarter searching of NFT sales
      const logQueries = (queryParams) => axios.post(axiosURL,queryParams);
      const promises = queryParams.map(logQueries);
      let logData = await Promise.all(promises);

      //console.log("LOG DATA LENGTH: ",logData.length);

      for (const l of logData) {

        var log = l.data.result
        for (var e=0; e<log.length; e+=1) {
          if (rawTxs.has(log[e].transactionHash)) {

            if (log[e].address.toLowerCase() == openSeaWyvernExchangev2.toLowerCase()) {

              const iface = new ethers.utils.Interface(['event OrdersMatched (bytes32 buyHash, bytes32 sellHash, address indexed maker, address indexed taker, uint256 price, bytes32 indexed metadata)'])

              const rawLog = {
                data: log[e].data,
                topics: log[e].topics,
              };

              var parsedLog = (iface.parseLog(rawLog).args);
              var price = (JSON.parse(parsedLog["price"]))

              swapAgInfo[log[e].blockNumber] ??= {
                "price": 0,
                "txHash": log[e].transactionHash,
                "relativeblockNum": log[e].blockNumber-blockOffset,
                "marketplace": "Opensea"
              };

              swapAgInfo[log[e].blockNumber]["price"] = swapAgInfo[log[e].blockNumber]["price"] + (parseInt(price)*(1/1000000000000000000))
              lastPriceList.push(swapAgInfo[log[e].blockNumber]["price"])
            }

            if (log[e].address.toLowerCase() == looksRareExchange.toLowerCase()) {

              const rawLog = {
                data: log[e].data,
                topics: log[e].topics,
              };

              try {
                const iface = new ethers.utils.Interface(['event TakerAsk (bytes32 orderHash, uint256 orderNonce, address indexed taker, address indexed maker, address indexed strategy, address currency, address collection, uint256 tokenId, uint256 amount, uint256 price)'])
                var parsedLog = (iface.parseLog(rawLog).args);
              }

              catch {
                const iface = new ethers.utils.Interface(['event TakerBid (bytes32 orderHash, uint256 orderNonce, address indexed taker, address indexed maker, address indexed strategy, address currency, address collection, uint256 tokenId, uint256 amount, uint256 price)'])
                var parsedLog = (iface.parseLog(rawLog).args);
              }

              var price = (JSON.parse(parsedLog["price"]))
              var currency = ((parsedLog["currency"]))

              swapAgInfo[log[e].blockNumber] ??= {
                "price": 0,
                "txHash": log[e].transactionHash,
                "relativeblockNum": log[e].blockNumber-blockOffset,
                "marketplace": "LooksRare"
              };

              if (currency.toLowerCase() == wETHaddress.toLowerCase()) {
                swapAgInfo[log[e].blockNumber]["price"] = swapAgInfo[log[e].blockNumber]["price"] + (parseInt(price)*(1/1000000000000000000))
                lastPriceList.push(swapAgInfo[log[e].blockNumber]["price"])
              }

            }

          }
        }
      }

    }

    for (let bucket = 0; bucket < 24; bucket++) {
      swapData[bucket] ??= {
        "name": "Hr." + String(bucket+1),
        "sales": 0,
        "volume": 0,
        "avgprice": 0,
      };
    }

    var currBlockNum = 0;
    var lastPrice = 0;

    for (const [key, value] of Object.entries(swapAgInfo)) {
      var blockNum = Math.floor(value.relativeblockNum/(offset/24));

      swapData[blockNum]["sales"] = (swapData[blockNum]["sales"] + 1);
      swapData[blockNum]["volume"] = (swapData[blockNum]["volume"] + Math.round(value.price));
      swapData[blockNum]["avgprice"] = Math.round(swapData[blockNum]["volume"]/swapData[blockNum]["sales"]);

      if (key > currBlockNum) {
        lastPrice = value.price
        currBlockNum = key
      }
    }

    var sum = lastPriceList.reduce((a, b) => Math.round(a + b), 0);

    setPriceVolume([sum,lastPrice.toFixed(2)])
    setPriceVolLoading(false);
    setChartData(swapData);
  };

  useEffect(() => {
    getContractInfo();
  }, []);

  useEffect(() => {
    getContractSample();
  }, []);

  useEffect(() => {
    getPriceVolume();
  }, []);

  if ((isContractLoading == false) && (isSampleLoading == false) && (isPriceVolLoading == false)) {

    return (
      <div>
        <div class="grid bg-white centered m-10 rounded-lg shadow-3xl md:flex max-w-2xl ">
          <div class="p-6">

          <h1 class="font-bold md:text-4xl text-black marginBottom:2">
          <div class="avatar align-middle">
            <div class="w-16 rounded-full">
              <img src={contractSample[0]} />
            </div>
          </div>
           &nbsp; {contractName} </h1>
            <p class="text-black">

              <div class="stats bg-primary-content shadow m-1 shadow-3xl w-full">

              <div class="stat place-items-center">
                <div class="stat-value text-black"> {(contractSupply/1000).toFixed(1)} K </div>
                <div class="stat-title text-black">NFTs</div>
              </div>

              <div class="stat place-items-center">
              <div class="avatar">
                <div class="w-12 rounded-full">
                  <img src="https://www.vhv.rs/dpng/d/420-4206472_fork-cryptocurrency-ethereum-bitcoin-classic-png-download-ethereum.png" />
                </div>
              </div>
                <div class="stat-figure text-secondary">
                <div class="stat-value text-black"> &nbsp; {priceVolume[1]} </div>
                <div class="stat-title text-black">Last Sold Price</div>
                </div>
              </div>

              <div class="stat place-items-center">
                <div class="avatar">
                  <div class="w-12 rounded-full">
                    <img src="https://www.vhv.rs/dpng/d/420-4206472_fork-cryptocurrency-ethereum-bitcoin-classic-png-download-ethereum.png" />
                  </div>
                </div>
                <div class="stat-figure text-secondary ">
                  <div class="stat-value text-black">{priceVolume[0]}</div>
                  <div class="stat-title text-black">Volume Traded</div>
                </div>
              </div>
            </div>

            <div class="flex justify-evenly .... mt-2">
              <div class="avatar">
                <div class="object-contain rounded-xl m-2 place-items-center">
                <img src={contractSample[1]} />
                </div>
              </div>
              <div class="avatar">
                <div class="object-contain rounded-xl m-2 place-items-center">
                <img src={contractSample[2]} />
                </div>
              </div>
              <div class="avatar">
                <div class="object-contain rounded-xl m-2 place-items-center">
                <img src={contractSample[3]} />
                </div>
              </div>
              <div class="avatar">
                <div class="object-contain rounded-xl m-2 place-items-center">
                <img src={contractSample[4]} />
                </div>
              </div>
            </div>
            <div class="w-32 place-items-center rounded-full">
              <img src="https://www.notion.so/image/https%3A%2F%2Fs3-us-west-2.amazonaws.com%2Fsecure.notion-static.com%2F744c2904-dc3e-49fb-86c4-e226122ba026%2FBadge_-_Certified_Infrastructure.svg?table=block&id=20e21c86-b636-4496-b584-42bb15bbe05f&spaceId=d0ba2238-3147-4060-8b5a-f8d323981378&userId=a8b0788e-5af8-4db7-ae8e-1e0b8e90a10b&cache=v2" />
            </div>
            </p>
          </div>
        </div>

          <div class="grid bg-white centered m-10 rounded-lg shadow-3xl md:flex max-w-2xl ">
            <div class="p-6">

            <h1 class="font-bold md:text-4xl text-black marginBottom:2">
            <div class="avatar align-middle">
              <div class="w-16 rounded-full">
                <img src={contractSample[0]} />
              </div>
            </div>
             &nbsp; {contractName}
             </h1>
              <p class="text-black">

                <div class="stats bg-primary-content shadow m-1 shadow-3xl w-full">

                <div class="stat place-items-center">
                  <div class="stat-value text-black"> {(contractSupply/1000).toFixed(1)} K </div>
                  <div class="stat-title text-black">NFTs</div>
                </div>

                <div class="stat place-items-center">
                <div class="avatar">
                  <div class="w-12 rounded-full">
                    <img src="https://www.vhv.rs/dpng/d/420-4206472_fork-cryptocurrency-ethereum-bitcoin-classic-png-download-ethereum.png" />
                  </div>
                </div>
                  <div class="stat-figure text-secondary">
                  <div class="stat-value text-black"> &nbsp; {priceVolume[1]} </div>
                  <div class="stat-title text-black">Last Sold Price</div>
                  </div>
                </div>

                <div class="stat place-items-center">
                  <div class="avatar">
                    <div class="w-12 rounded-full">
                      <img src="https://www.vhv.rs/dpng/d/420-4206472_fork-cryptocurrency-ethereum-bitcoin-classic-png-download-ethereum.png" />
                    </div>
                  </div>
                  <div class="stat-figure text-secondary ">
                    <div class="stat-value text-black">{priceVolume[0]}</div>
                    <div class="stat-title text-black">Volume Traded</div>
                  </div>
                </div>
              </div>

              <div class="flex justify-evenly .... mt-1">

              </div>

              </p>

              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer>
                  <ComposedChart
                    width={500}
                    height={400}
                    data={chartData}
                    margin={{
                      top: 20,
                      right: 20,
                      bottom: 20,
                      left: 20,
                    }}
                  >
                  <CartesianGrid stroke="#f5f5f5" />
                  <YAxis dataKey="sales"/>
                  <Tooltip
                  wrapperStyle={{ backgroundColor: "white" }}
                  labelStyle={{ color: "#191970" }}
                  content={<CustomTooltip />} />
                  <Bar dataKey="sales" barSize={10} fill="#bfdcf6"/>
                  <Scatter dataKey="avgprice" fill="#00000000" />
                  <Scatter dataKey="volume" fill="#00000000" />
                </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div class="w-32 place-items-center rounded-full">
                <img src="https://www.notion.so/image/https%3A%2F%2Fs3-us-west-2.amazonaws.com%2Fsecure.notion-static.com%2F744c2904-dc3e-49fb-86c4-e226122ba026%2FBadge_-_Certified_Infrastructure.svg?table=block&id=20e21c86-b636-4496-b584-42bb15bbe05f&spaceId=d0ba2238-3147-4060-8b5a-f8d323981378&userId=a8b0788e-5af8-4db7-ae8e-1e0b8e90a10b&cache=v2" />
              </div>
            </div>

          </div>

        </div>
      )
    }

    else if ((isContractLoading == false) && (isSampleLoading == false) && (isPriceVolLoading == true)) {

        return (
          <div>
            <div class="grid bg-white centered m-10 rounded-lg shadow-3xl md:flex max-w-2xl ">
              <div class="p-6">

              <h1 class="font-bold md:text-4xl text-black marginBottom:2">
              <div class="avatar align-middle">
                <div class="w-16 rounded-full">
                  <img src={contractSample[0]} />
                </div>
              </div>
               &nbsp; {contractName} </h1>
                <p class="text-black">

                  <div class="stats bg-primary-content shadow m-1 shadow-3xl w-full">

                  <div class="stat place-items-center">
                    <div class="stat-value text-black"> {(contractSupply/1000).toFixed(1)} K </div>
                    <div class="stat-title text-black">NFTs</div>
                  </div>

                  <div class="stat place-items-center">
                  <div class="avatar">
                    <div class="w-12 rounded-full">
                      <img src="https://www.vhv.rs/dpng/d/420-4206472_fork-cryptocurrency-ethereum-bitcoin-classic-png-download-ethereum.png" />
                    </div>
                  </div>
                    <div class="stat-figure text-secondary">
                    <div class="stat-value text-black"> &nbsp; 🔄 </div>
                    <div class="stat-title text-black">Last Sold Price</div>
                    </div>
                  </div>

                  <div class="stat place-items-center">
                    <div class="avatar">
                      <div class="w-12 rounded-full">
                        <img src="https://www.vhv.rs/dpng/d/420-4206472_fork-cryptocurrency-ethereum-bitcoin-classic-png-download-ethereum.png" />
                      </div>
                    </div>
                    <div class="stat-figure text-secondary ">
                      <div class="stat-value text-black"> &nbsp; 🔄 </div>
                      <div class="stat-title text-black">Volume Traded</div>
                    </div>
                  </div>
                </div>

                <div class="flex justify-evenly .... mt-2">
                  <div class="avatar">
                    <div class="object-contain rounded-xl m-2 place-items-center">
                    <img src={contractSample[1]} />
                    </div>
                  </div>
                  <div class="avatar">
                    <div class="object-contain rounded-xl m-2 place-items-center">
                    <img src={contractSample[2]} />
                    </div>
                  </div>
                  <div class="avatar">
                    <div class="object-contain rounded-xl m-2 place-items-center">
                    <img src={contractSample[3]} />
                    </div>
                  </div>
                  <div class="avatar">
                    <div class="object-contain rounded-xl m-2 place-items-center">
                    <img src={contractSample[4]} />
                    </div>
                  </div>
                </div>

                </p>
              </div>
              </div>

              <div class="grid bg-white centered m-10 rounded-lg shadow-3xl md:flex max-w-2xl ">
                <div class="p-6">

                <h1 class="font-bold md:text-4xl text-black marginBottom:2">
                <div class="avatar align-middle">
                  <div class="w-16 rounded-full">
                    <img src={contractSample[0]} />
                  </div>
                </div>
                 &nbsp; {contractName} </h1>
                  <p class="text-black">

                    <div class="stats bg-primary-content shadow m-1 shadow-3xl w-full">

                    <div class="stat place-items-center">
                      <div class="stat-value text-black"> {(contractSupply/1000).toFixed(1)} K </div>
                      <div class="stat-title text-black">NFTs</div>
                    </div>

                    <div class="stat place-items-center">
                    <div class="avatar">
                      <div class="w-12 rounded-full">
                        <img src="https://www.vhv.rs/dpng/d/420-4206472_fork-cryptocurrency-ethereum-bitcoin-classic-png-download-ethereum.png" />
                      </div>
                    </div>
                      <div class="stat-figure text-secondary">
                      <div class="stat-value text-black"> &nbsp; 🔄 </div>
                      <div class="stat-title text-black">Last Sold Price</div>
                      </div>
                    </div>

                    <div class="stat place-items-center">
                      <div class="avatar">
                        <div class="w-12 rounded-full">
                          <img src="https://www.vhv.rs/dpng/d/420-4206472_fork-cryptocurrency-ethereum-bitcoin-classic-png-download-ethereum.png" />
                        </div>
                      </div>
                      <div class="stat-figure text-secondary ">
                        <div class="stat-value text-black"> &nbsp; 🔄 </div>
                        <div class="stat-title text-black">Volume Traded</div>
                      </div>
                    </div>
                  </div>

                  <div class="flex justify-evenly .... mt-2">
                    <div class="avatar">
                      <div class="object-contain rounded-xl m-2 place-items-center">
                      <img src={contractSample[1]} />
                      </div>
                    </div>
                    <div class="avatar">
                      <div class="object-contain rounded-xl m-2 place-items-center">
                      <img src={contractSample[2]} />
                      </div>
                    </div>
                    <div class="avatar">
                      <div class="object-contain rounded-xl m-2 place-items-center">
                      <img src={contractSample[3]} />
                      </div>
                    </div>
                    <div class="avatar">
                      <div class="object-contain rounded-xl m-2 place-items-center">
                      <img src={contractSample[4]} />
                      </div>
                    </div>
                  </div>

                  </p>
                </div>
                </div>

            </div>
          )
        }

    else {
      return (

        <div>
          <div class="grid bg-white centered m-10 rounded-lg shadow-3xl md:flex max-w-2xl place-content-center">
            <div class="p-6">

            <h1 class="font-bold md:text-4xl mb-2 text-black marginBottom:2">
            <div class="avatar">
              <div class="w-16 rounded-full">
                <img src="https://socialistmodernism.com/wp-content/uploads/2017/07/placeholder-image-768x576.png" />
              </div>
            </div>
             &nbsp; ----------- </h1>
              <p class="text-black">

                <div class="stats bg-primary-content shadow m-1 shadow-3xl w-full">

                <div class="stat place-items-center">
                  <div class="stat-value text-black"> &nbsp; 🔄 K </div>
                  <div class="stat-title text-black">NFTs</div>
                </div>

                <div class="stat place-items-center">
                <div class="avatar">
                  <div class="w-12 rounded-full">
                    <img src="https://www.vhv.rs/dpng/d/420-4206472_fork-cryptocurrency-ethereum-bitcoin-classic-png-download-ethereum.png" />
                  </div>
                </div>
                  <div class="stat-figure text-secondary">
                  <div class="stat-value text-black"> &nbsp; 🔄 </div>
                  <div class="stat-title text-black">Last Sold Price</div>
                  </div>
                </div>

                <div class="stat place-items-center">
                  <div class="avatar">
                    <div class="w-12 rounded-full">
                      <img src="https://www.vhv.rs/dpng/d/420-4206472_fork-cryptocurrency-ethereum-bitcoin-classic-png-download-ethereum.png" />
                    </div>
                  </div>
                  <div class="stat-figure text-secondary ">
                    <div class="stat-value text-black"> &nbsp; 🔄 </div>
                    <div class="stat-title text-black">Volume Traded</div>
                  </div>
                </div>
              </div>


              </p>
            </div>

          </div>

          <div class="grid bg-white centered m-10 rounded-lg shadow-3xl md:flex max-w-2xl place-content-center">
            <div class="p-6">

            <h1 class="font-bold md:text-4xl mb-2 text-black marginBottom:2">
            <div class="avatar">
              <div class="w-16 rounded-full">
                <img src="https://socialistmodernism.com/wp-content/uploads/2017/07/placeholder-image-768x576.png" />
              </div>
            </div>
             &nbsp; ----------- </h1>
              <p class="text-black">

                <div class="stats bg-primary-content shadow m-1 shadow-3xl w-full">

                <div class="stat place-items-center">
                  <div class="stat-value text-black"> &nbsp; 🔄 K </div>
                  <div class="stat-title text-black">NFTs</div>
                </div>

                <div class="stat place-items-center">
                <div class="avatar">
                  <div class="w-12 rounded-full">
                    <img src="https://www.vhv.rs/dpng/d/420-4206472_fork-cryptocurrency-ethereum-bitcoin-classic-png-download-ethereum.png" />
                  </div>
                </div>
                  <div class="stat-figure text-secondary">
                  <div class="stat-value text-black"> &nbsp; 🔄 </div>
                  <div class="stat-title text-black">Last Sold Price</div>
                  </div>
                </div>

                <div class="stat place-items-center">
                  <div class="avatar">
                    <div class="w-12 rounded-full">
                      <img src="https://www.vhv.rs/dpng/d/420-4206472_fork-cryptocurrency-ethereum-bitcoin-classic-png-download-ethereum.png" />
                    </div>
                  </div>
                  <div class="stat-figure text-secondary ">
                    <div class="stat-value text-black"> &nbsp; 🔄 </div>
                    <div class="stat-title text-black">Volume Traded</div>
                  </div>
                </div>
              </div>


              </p>
            </div>

          </div>

        </div>

        )
      }
  }



export default App;
