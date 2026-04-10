#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SSLPinningModule, NSObject)

RCT_EXTERN_METHOD(request:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup { return NO; }

@end
