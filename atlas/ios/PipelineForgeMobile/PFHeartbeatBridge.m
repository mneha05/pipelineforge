#import "PFHeartbeatBridge.h"
#import <sys/utsname.h>

@implementation PFHeartbeatBridge

+ (NSString *)legacyNodeSignature {
    struct utsname systemInfo;
    uname(&systemInfo);
    NSString *machine = [NSString stringWithCString:systemInfo.machine
                                           encoding:NSUTF8StringEncoding];
    return [NSString stringWithFormat:@"objc-bridge/%@", machine ?: @"unknown"];
}

@end
