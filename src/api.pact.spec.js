// Import Pact framework components for consumer-driven contract testing
import { PactV3 } from '@pact-foundation/pact';
import { API } from './api';  // Our API client class to test
import { MatchersV3 } from '@pact-foundation/pact';  // Pact matchers for flexible matching
import { Product } from './product';  // Product model/class

// Destructure commonly used matchers from Pact
// eachLike: matches arrays with elements of a specific structure
// like: flexible matcher that matches type/structure rather than exact values
const { eachLike, like } = MatchersV3;
const Pact = PactV3;

// Create a Pact mock provider instance
// This simulates the provider service during testing
const mockProvider = new Pact({
  consumer: 'pactflow-example-consumer',  // Name of the consuming application
  provider: process.env.PACT_PROVIDER     // Provider name from env var or default
    ? process.env.PACT_PROVIDER
    : 'pactflow-example-provider'
});


// Main test suite for API contract testing
describe('API Pact test', () => {
  
  // Test suite for single product retrieval scenarios
  describe('retrieving a product', () => {
    
    // Happy path test: product exists and is returned successfully
    test('ID 10 exists', async () => {
      // Arrange - Define expected product structure
      const expectedProduct = {
        id: '10',
        type: 'CREDIT_CARD',
        name: '28 Degrees'
      };

      // Example of how adding unexpected fields would break the contract
      // Uncomment to see this fail
      // const expectedProduct = { id: '10', type: 'CREDIT_CARD', name: '28 Degrees', price: 30.0, newField: 22}

      // Set up Pact interaction specification
      mockProvider
        .given('a product with ID 10 exists')           // Provider state setup
        .uponReceiving('a request to get a product')    // Human-readable description
        .withRequest({                                  // Expected HTTP request
          method: 'GET',
          path: '/product/10',
          headers: {
            // Use 'like' matcher for Authorization header - matches any Bearer token format
            Authorization: like('Bearer 2019-01-14T11:34:18.045Z')
          }
        })
        .willRespondWith({                              // Expected HTTP response
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          // Use 'like' matcher for response body - matches structure, not exact values
          body: like(expectedProduct)
        });

      // Execute the test against the mock provider
      return mockProvider.executeTest(async (mockserver) => {
        // Act - Make actual API call using our API client
        const api = new API(mockserver.url);  // Point to Pact mock server
        const product = await api.getProduct('10');

        // Assert - Verify we got the expected response structure
        expect(product).toStrictEqual(new Product(expectedProduct));
        return;
      });
    });

    // Error case test: product doesn't exist, should return 404
    test('product does not exist', async () => {
      // Set up Pact interaction for non-existent product
      mockProvider
        .given('a product with ID 11 does not exist')   // Provider state for missing product
        .uponReceiving('a request to get a product')
        .withRequest({
          method: 'GET',
          path: '/product/11',                          // Different product ID
          headers: {
            Authorization: like('Bearer 2019-01-14T11:34:18.045Z')
          }
        })
        .willRespondWith({
          status: 404                                   // HTTP 404 Not Found response
          // No body needed for 404 response
        });

      // Execute test and verify error handling
      return mockProvider.executeTest(async (mockserver) => {
        const api = new API(mockserver.url);

        // Assert that API call throws expected error for non-existent product
        await expect(api.getProduct('11')).rejects.toThrow(
          'Request failed with status code 404'
        );
        return;
      });
    });
  });

  // Test suite for multiple products retrieval
  describe('retrieving products', () => {
    
    // Test getting all products successfully
    test('products exists', async () => {
      // Define expected product structure (same as individual product)
      const expectedProduct = {
        id: '10',
        type: 'CREDIT_CARD',
        name: '28 Degrees'
      };

      // Set up Pact interaction for products list endpoint
      mockProvider
        .given('products exist')                        // Provider state with available products
        .uponReceiving('a request to get all products')
        .withRequest({
          method: 'GET',
          path: '/products',                            // Different endpoint for all products
          headers: {
            Authorization: like('Bearer 2019-01-14T11:34:18.045Z')
          }
        })
        .willRespondWith({
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8'
          },
          // Use 'eachLike' for array responses - matches array with elements like expectedProduct
          body: eachLike(expectedProduct)
        });

      // Execute test for multiple products endpoint
      return mockProvider.executeTest(async (mockserver) => {
        const api = new API(mockserver.url);

        // Make request to get all products
        const products = await api.getAllProducts();

        // Assert that we got an array with products matching expected structure
        expect(products).toStrictEqual([new Product(expectedProduct)]);
        return;
      });
    });
  });
});

/*
KEY CONCEPTS EXPLAINED:

1. CONTRACT TESTING: This tests the contract/interface between consumer and provider
   - Ensures both sides agree on API structure without needing actual provider running
   - Generates pact files that providers can verify against

2. PACT MATCHERS:
   - like(): Matches type/structure, not exact values (flexible matching)
   - eachLike(): For arrays - matches structure of array elements
   - Allows APIs to evolve while maintaining compatibility

3. PROVIDER STATES:
   - .given() sets up data conditions on provider side
   - Ensures tests run against known data states
   - Provider must implement these states for verification

4. TEST STRUCTURE:
   - Arrange: Set up expected data and Pact interactions
   - Act: Make API calls through your client
   - Assert: Verify responses match expectations

5. MOCK SERVER:
   - Pact creates a mock HTTP server during tests
   - Returns responses based on your interaction definitions
   - No need for actual provider service to be running

6. CONTRACT GENERATION:
   - Running these tests generates pact files
   - Provider team uses these files to verify their implementation
   - Ensures consumer-provider compatibility
*/