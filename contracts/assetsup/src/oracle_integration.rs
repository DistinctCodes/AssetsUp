#![no_std]
use soroban_sdk::{contractimpl, contracttype, Address, Env, Vec, Map, BytesN, Symbol, RawVal};

#[derive(Clone)]
#[contracttype]
pub enum OracleType {
    Price,
    Weather,
    IoT,
    Verification,
    Market,
    Random,
    Custom,
}

#[derive(Clone)]
#[contracttype]
pub enum FeedStatus {
    Active,
    Paused,
    Deprecated,
}

#[derive(Clone)]
#[contracttype]
pub enum AggregationMethod {
    Median,
    Mean,
    WeightedAverage,
    MajorityVote,
    TrimmedMean,
}

#[derive(Clone)]
#[contracttype]
pub struct OracleInfo {
    pub oracle: Address,
    pub name: Symbol,
    pub oracle_type: OracleType,
    pub data_types: Vec<Symbol>,
    pub accuracy: u32,
    pub avg_response_time: u64,
    pub total_requests: u64,
    pub success_count: u64,
    pub failure_count: u64,
    pub reputation: u64,
    pub stake: u64,
    pub registered_at: u64,
    pub active: bool,
    pub last_updated: u64,
}

#[derive(Clone)]
#[contracttype]
pub struct DataFeed {
    pub feed_id: u64,
    pub name: Symbol,
    pub data_type: Symbol,
    pub update_frequency: u64,
    pub aggregation_method: AggregationMethod,
    pub min_oracles: u32,
    pub current_value: i128,
    pub last_updated: u64,
    pub deviation_threshold: u64,
    pub status: FeedStatus,
    pub subscribed_oracles: Vec<Address>,
}

#[derive(Clone)]
#[contracttype]
pub struct DataPoint {
    pub point_id: u64,
    pub oracle: Address,
    pub value: i128,
    pub confidence: u32,
    pub observed_at: u64,
    pub submitted_at: u64,
    pub metadata: Symbol,
}

#[derive(Clone)]
#[contracttype]
pub struct OracleRequest {
    pub request_id: u64,
    pub requester: Address,
    pub request_type: Symbol,
    pub required_oracles: u32,
    pub responses: u32,
    pub created_at: u64,
    pub deadline: u64,
    pub min_confidence: u32,
    pub fulfilled: bool,
}

#[derive(Clone)]
#[contracttype]
pub struct OracleResponse {
    pub oracle: Address,
    pub value: i128,
    pub confidence: u32,
    pub timestamp: u64,
}

pub struct OracleContract;

#[contractimpl]
impl OracleContract {
    // Initialize admin
    pub fn init(env: Env, admin: Address) {
        env.storage().set(&Symbol::short("admin"), &admin);
        env.storage().set(&Symbol::short("feed_counter"), &0u64);
        env.storage().set(&Symbol::short("request_counter"), &0u64);
        env.storage().set(&Symbol::short("point_counter"), &0u64);
    }

    fn get_admin(env: &Env) -> Address {
        env.storage().get_unchecked::<Symbol, Address>(&Symbol::short("admin")).unwrap()
    }

    fn assert_admin(env: &Env, caller: &Address) {
        let admin = Self::get_admin(env);
        if caller != &admin {
            panic!("Not admin");
        }
    }

    // Register an oracle
    pub fn register_oracle(
        env: Env,
        oracle: Address,
        name: Symbol,
        oracle_type: OracleType,
        data_types: Vec<Symbol>,
        stake: u64,
    ) {
        let now = env.ledger().timestamp();
        let info = OracleInfo {
            oracle: oracle.clone(),
            name,
            oracle_type,
            data_types,
            accuracy: 100,
            avg_response_time: 0,
            total_requests: 0,
            success_count: 0,
            failure_count: 0,
            reputation: stake,
            stake,
            registered_at: now,
            active: true,
            last_updated: now,
        };
        env.storage().set(&Self::oracle_key(&oracle), &info);
    }

    pub fn deactivate_oracle(env: Env, admin: Address, oracle: Address) {
        Self::assert_admin(&env, &admin);
        let mut info: OracleInfo = env.storage().get_unchecked(&Self::oracle_key(&oracle)).unwrap();
        info.active = false;
        env.storage().set(&Self::oracle_key(&oracle), &info);
    }

    fn oracle_key(oracle: &Address) -> Symbol {
        Symbol::short(&format!("oracle_{}", oracle.to_string()))
    }

    // Create a feed
    pub fn create_feed(
        env: Env,
        admin: Address,
        name: Symbol,
        data_type: Symbol,
        update_frequency: u64,
        aggregation_method: AggregationMethod,
        min_oracles: u32,
        deviation_threshold: u64,
    ) -> u64 {
        Self::assert_admin(&env, &admin);
        let mut feed_counter: u64 = env.storage().get_unchecked(&Symbol::short("feed_counter")).unwrap();
        feed_counter += 1;
        let feed = DataFeed {
            feed_id: feed_counter,
            name,
            data_type,
            update_frequency,
            aggregation_method,
            min_oracles,
            current_value: 0,
            last_updated: 0,
            deviation_threshold,
            status: FeedStatus::Active,
            subscribed_oracles: Vec::new(&env),
        };
        env.storage().set(&Symbol::short(&format!("feed_{}", feed_counter)), &feed);
        env.storage().set(&Symbol::short("feed_counter"), &feed_counter);
        feed_counter
    }

    pub fn subscribe_oracle(env: Env, feed_id: u64, oracle: Address) {
        let mut feed: DataFeed = env.storage().get_unchecked(&Symbol::short(&format!("feed_{}", feed_id))).unwrap();
        feed.subscribed_oracles.push_back(oracle);
        env.storage().set(&Symbol::short(&format!("feed_{}", feed_id)), &feed);
    }

    // Submit a data point
    pub fn submit_data_point(
        env: Env,
        feed_id: u64,
        oracle: Address,
        value: i128,
        confidence: u32,
        metadata: Symbol,
    ) {
        if confidence > 100 {
            panic!("Invalid confidence");
        }
        let mut point_counter: u64 = env.storage().get_unchecked(&Symbol::short("point_counter")).unwrap();
        point_counter += 1;

        let now = env.ledger().timestamp();
        let point = DataPoint {
            point_id: point_counter,
            oracle: oracle.clone(),
            value,
            confidence,
            observed_at: now,
            submitted_at: now,
            metadata,
        };
        let mut points: Vec<DataPoint> = env.storage().get(&Symbol::short(&format!("points_{}", feed_id))).unwrap_or(Vec::new(&env));
        points.push_back(point);
        env.storage().set(&Symbol::short(&format!("points_{}", feed_id)), &points);
        env.storage().set(&Symbol::short("point_counter"), &point_counter);

        // Aggregate if enough points
        let feed: DataFeed = env.storage().get_unchecked(&Symbol::short(&format!("feed_{}", feed_id))).unwrap();
        if points.len() >= feed.min_oracles as usize {
            Self::aggregate_feed(env, feed_id);
        }
    }

    fn aggregate_feed(env: Env, feed_id: u64) {
        let points: Vec<DataPoint> = env.storage().get_unchecked(&Symbol::short(&format!("points_{}", feed_id))).unwrap();
        if points.len() == 0 {
            return;
        }
        let mut sum: i128 = 0;
        for p in points.iter() {
            sum += p.value;
        }
        let aggregated = sum / points.len() as i128;
        let mut feed: DataFeed = env.storage().get_unchecked(&Symbol::short(&format!("feed_{}", feed_id))).unwrap();
        let old_value = feed.current_value;
        feed.current_value = aggregated;
        feed.last_updated = env.ledger().timestamp();
        env.storage().set(&Symbol::short(&format!("feed_{}", feed_id)), &feed);

        // clear points
        env.storage().set(&Symbol::short(&format!("points_{}", feed_id)), &Vec::new(&env));

        // Check deviation
        let deviation = if old_value != 0 { ((aggregated - old_value).abs() * 100) / old_value.abs() } else { 0 };
        if deviation as u64 >= feed.deviation_threshold {
            // Emit event (placeholder)
            env.events().publish((Symbol::short("DeviationTriggered"),), (feed_id, old_value, aggregated));
        }
    }
}